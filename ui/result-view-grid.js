var grid;
var options = {
    enableCellNavigation: true,
    enableColumnReorder: false,
    enableTextSelectionOnCells: true,
    syncColumnCellResize: true
};
var vm = new Vue({
    el: '#result-control',
    template: `
    <div class="container-fluid">
    <div v-if="hasError">
      <b-alert show variant="danger">{{sqlStatement.error}}</b-alert>
      <pre>{{sqlStatement.sql}}</pre>
    </div>
    <div class="row" v-if="!hasError">
      <div class="col" v-if="isQuery && !busy">
        <div class="badge">Executions: {{sqlStatement.executionCount}}</div>
        <div class="badge">Elapsed: {{sqlStatement.executionTime}}ms</div>
        <div class="badge">Rows: {{totalRows}}</div>
        <div class="badge">More?: {{sqlStatement.moreRows}}</div>
      </div>
      <div class="col" v-if="!isQuery && !busy">
        <div class="badge">Elapsed: {{sqlStatement.executionTime}}ms</div>
        <div class="badge">Rows Affected: {{sqlStatement.updateCount}}</div>
        <div class="badge">Status: {{sqlStatement.status}}</div>
        <pre>{{sqlStatement.sql}}</pre>
      </div>
      <div class="col" v-if="busy">
        <span class="fa fa-spinner fa-pulse fa-3x fa-fw"></span>
        <div class="badge">Executing</div>
        <pre>{{sqlStatement.sql}}</pre>
      </div>
      <div class="button-group col">
        <b-btn :disabled="busy" class="btn-sm btn-success fa fa-refresh" title="Refresh" @click="execute('reexecute')"/>
        <b-btn :disabled="!busy" class="btn-sm btn-danger fa fa-stop" title="Cancel" @click="execute('cancel')"/>
        <b-btn :disabled="!isTxn" class="btn-sm btn-success fa fa-check" title="Commit" @click="execute('commit')"/>
        <b-btn :disabled="!isTxn" class="btn-sm btn-warning fa fa-undo" title="Rollback" @click="execute('rollback')"/>
        <b-btn :disabled="!totalRows" class="btn-sm btn-success fa fa-download" title="Export" @click="execute('export')"/>
        <b-btn class="btn-sm btn-danger fa fa-close" title="Close" @click="execute('close')"/>
      </div>
      <div class="col">
        <input type="text" placeholder="Filter..." style="width:100%;"/>
      </div>
      </div>
      <div id="result-grid" />
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
            if (this.sqlStatement.columns) {
                this.createGrid()
            }
        },
        execute: function (command) {
            if (command === 'reexecute') {
                this.sqlStatement.status = 'executing'
            }
            this.vscode.postMessage({command: command, id: this.sqlStatement.id})
        },
        createGrid: function () {
            var columns = this.sqlStatement.columns.map((column) => {
                return { id: column, name: column, field: column, headerCssClass: 'result-grid-header', cssClass: 'result-grid-row' }
            });
            var data = this.sqlStatement.rows.map((row) => {
                var rowObject = {};
                columns.forEach((column, ndx) => {
                    rowObject[column.name] = row[ndx];
                })
                return rowObject;
            })
            var width = window.innerWidth - 75
            var height = window.innerHeight - 50
            $('#result-grid').css({ 'width': width + 'px', 'height': height + 'px' })
            grid = new Slick.Grid("#result-grid", data, columns, options);
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