var vm = new Vue({
    el: '#app',
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
    <table class="results table-hover" v-if="!hasError">
        <thead>
            <tr>
               <th nowrap class="results" v-for="column in columns">{{column}}</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="row in rows">
                <td nowrap class="results" v-for="value in row">{{value}}</td>
            </tr>
        </tbody>
    </table>
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
        totalRows: function () { return this.rows.length; },
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
        if ( this.sqlStatement.columns.length > 0 ) {
            this.columns = this.sqlStatement.columns
        }
        this.rows = this.sqlStatement.rows
        this.busy = (typeof this.sqlStatement.updateCount === 'undefined') || this.sqlStatement.updateCount === null
    }
})