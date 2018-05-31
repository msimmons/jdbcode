var grid
const options = {
    enableCellNavigation: true,
    enableColumnReorder: false,
    enableTextSelectionOnCells: true,
    syncColumnCellResize: true
}
var vm = new Vue({
    el: '#result-control',
    template: `
<div class="container-fluid">
  <div v-if="hasError">
    <div class="alert alert-danger" role="alert">{{sqlStatement.error}}</div>
    <pre>{{sqlStatement.sql}}</pre>
  </div>
  <div class="row" v-if="!hasError">
    <div class="col" v-if="isQuery && !busy">
      <span class="badge badge-light">Executions &nbsp;<span class="badge badge-secondary">{{sqlStatement.executionCount}}</span></span>
      <span class="badge badge-light">Elapsed &nbsp;<span class="badge badge-secondary">{{sqlStatement.executionTime}}</span></span>
      <span class="badge badge-light">Rows &nbsp;<span class="badge badge-secondary">{{totalRows}}</span></span>
      <span class="badge badge-light">More &nbsp;<span class="badge badge-secondary">{{sqlStatement.moreRows}}</span></span>
    </div>
    <div class="col" v-if="!isQuery && !busy">
      <span class="badge badge-light">Elapsed &nbsp;<span class="badge badge-secondary">{{sqlStatement.executionTime}}</span></span>
      <span class="badge badge-light">Rows Affected &nbsp;<span class="badge badge-secondary">{{sqlStatement.updateCount}}</span></span>
      <span class="badge badge-light">Status &nbsp;<span class="badge badge-secondary">{{sqlStatement.status}}</span></span>
    </div>
    <div class="col" v-if="busy">
      <span class="fa fa-spinner fa-pulse fa-3x fa-fw"></span>
      <span class="badge">Executing</span>
    </div>
    <div class="col">
      <div class="btn-group" role="group">
        <button :disabled="busy" class="btn btn-success btn-sm fa fa-refresh" title="Refresh" @click="execute('reexecute')"/>
        <button :disabled="!busy" class="btn btn-danger btn-sm fa fa-stop" title="Cancel" @click="execute('cancel')"/>
      </div>
      <div class="btn-group" role="group">
        <button :disabled="!isTxn" class="btn btn-success btn-sm fa fa-check" title="Commit" @click="execute('commit')"/>
        <button :disabled="!isTxn" class="btn btn-warning btn-sm fa fa-undo" title="Rollback" @click="execute('rollback')"/>
      </div>
      <button :disabled="!totalRows" class="btn btn-success btn-sm fa fa-download" title="Export" @click="execute('export')"/>
      <button class="btn btn-danger btn-sm fa fa-close" title="Close" @click="execute('close')"/>
    </div>
    <div class="col" v-if="isQuery && !busy">
      <input class="form-control form-control-sm" type="text" placeholder="Filter..." style="width:100%;"/>
    </div>
  </div>
  <div class="row" v-if="!hasError && !isQuery">
    <pre>{{ sqlStatement.sql }}</pre>
  </div>
  <div id="result-grid" />
</div>
`,
    data: function () {
        return {
            columns: [],
            rows: [],
            sortBy: null,
            sortDesc: false,
            filter: null,
            sqlStatement: { rows: [], status: 'executing' },
            vscode: null
        }
    },
    computed: {
        busy: function() { return this.sqlStatement.status === 'executing' },
        totalRows: function () { return this.sqlStatement.rows.length },
        hasError: function () { return this.sqlStatement.error != null },
        isQuery: function () { return this.sqlStatement.type === 'query' },
        isTxn: function () { return this.sqlStatement.type === 'crud' && this.sqlStatement.status === 'executed' }
    },
    methods: {
        update: function (event) {
            this.sqlStatement = event.data
            if (this.sqlStatement.columns.length > 0) {
                if (!grid) {
                    this.createGrid()
                } else {
                    this.updateGrid()
                }
            }
        },
        execute: function (command) {
            if (command === 'reexecute') {
                this.sqlStatement.status = 'executing'
            }
            this.vscode.postMessage({command: command, id: this.sqlStatement.id})
        },
        createGrid: function () {
            this.columns = this.sqlStatement.columns.map((column, ndx) => {
                console.log(column + ndx)
                return { id: `${ndx}`, name: column, field: `${ndx}`, headerCssClass: 'result-grid-header', cssClass: 'result-grid-row' }
            });
            var data = this.getData()
            var width = window.innerWidth - 75
            var height = window.innerHeight - 50
            $('#result-grid').css({ 'width': width + 'px', 'height': height + 'px' })
            grid = new Slick.Grid("#result-grid", data, this.columns, options);
        },
        getData: function () {
            return this.sqlStatement.rows.map((row) => {
                var rowObject = {};
                this.columns.forEach((column, ndx) => {
                    rowObject[column.field] = row[ndx];
                })
                return rowObject;
            })
        },
        updateGrid: function () {
            var data = this.getData()
            grid.setData(data)
            grid.render()
        },
        clearGrid: function () {
            grid.setData([])
            grid.render()
        }
    },
    created: function () {
        // Handle the message inside the webview
        window.addEventListener('message', (event) => {
            this.update(event)
        })
        this.vscode = acquireVsCodeApi()
    }
})