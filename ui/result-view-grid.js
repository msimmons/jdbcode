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
      </div>
      <div class="col" v-if="busy">
        <span class="fa fa-spinner fa-pulse fa-3x fa-fw"></span>
        <div class="badge">Executing</div>
        <pre>{{sqlStatement.sql}}</pre>
      </div>
      <div class="button-group col">
        <b-btn :disabled="busy" class="btn-sm btn-success fa fa-refresh" title="Refresh" :href="refreshUri"/>
        <b-btn :disabled="!busy" class="btn-sm btn-danger fa fa-stop" title="Cancel" :href="cancelUri"/>
        <b-btn :disabled="isQuery || busy" class="btn-sm btn-success fa fa-check" title="Commit" :href="commitUri"/>
        <b-btn :disabled="isQuery || busy" class="btn-sm btn-warning fa fa-undo" title="Rollback" :href="rollbackUri"/>
        <b-btn :disabled="!totalRows" class="btn-sm btn-success fa fa-download" title="Export" :href="exportCsvUri"/>
        <b-btn class="btn-sm btn-danger fa fa-close" title="Close" :href="closeUri"/>
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
          busy: true,
          sqlStatement: null
      }
  },
  computed: {
      totalRows: function () { return this.sqlStatement.rows.length; },
      hasError: function () { return this.sqlStatement.error != null },
      refreshUri: function() { return this.commandUri('refresh') },
      cancelUri: function() { return this.commandUri('cancel') },
      commitUri: function() { return this.commandUri('commit') },
      rollbackUri: function() { return this.commandUri('rollback') },
      exportCsvUri: function() { return this.commandUri('export-csv') },
      closeUri: function() { return this.commandUri('close')},
      isQuery: function() { return !this.busy && this.sqlStatement.updateCount == -1 && this.sqlStatement.columns }
  },
  methods: {
      commandUri: function(command) {
          var id = this.sqlStatement.id
          return encodeURI('command:jdbcode.'+command+'?'+ JSON.stringify([id]))
      }
  },
  created: function () {
      this.sqlStatement = window['sql-statement']
      this.busy = (typeof this.sqlStatement.updateCount === 'undefined') || this.sqlStatement.updateCount === null
  },
  mounted: function() {
      var columns = this.sqlStatement.columns.map((column) => {
          return {id: column, name: column, field: column, headerCssClass: 'result-grid-header', cssClass: 'result-grid-row'}
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
      $('#result-grid').css({'width': width+'px','height': height+'px'})
      grid = new Slick.Grid("#result-grid", data, columns, options);
  }
})