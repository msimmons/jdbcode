var vm = new Vue({
    el: '#app',
    template: `
<b-container fluid style="font-size:12px">
    <b-container fluid class="w-50 ml-0" v-if="hasError">
        <b-alert show variant="danger">{{sqlStatement.error}}</b-alert>
        <pre>{{sqlStatement.sql}}</pre>
    </b-container>
    <b-container fluid v-if="!hasError">
        <b-button-toolbar >
            <b-input-group size="sm" class="w-25 m-2">
                <b-form-input v-model="filter" placeholder="Filter..."/>
            </b-input-group>
            <b-button-group size="sm" class="m-2">
                <b-btn :disabled="busy" variant="success" :href="refreshUri"><span v-b-tooltip title="Refresh" class="fa fa-refresh" /></b-btn>
                <b-btn :disabled="!busy" variant="danger" :href="cancelUri"><span v-b-tooltip title="Cancel" class="fa fa-stop"/></b-btn>
            </b-button-group>
            <b-button-group size="sm" class="m-2">
                <b-btn :disabled="isQuery || busy" variant="success" :href="commitUri"><span v-b-tooltip title="Commit" class="fa fa-check"/></b-btn>
                <b-btn :disabled="isQuery || busy" variant="warning" :href="rollbackUri"><span v-b-tooltip title="Rollback" class="fa fa-undo"/></b-btn>
            </b-button-group>
            <b-button-group size="sm" class="m-2">
                <b-dropdown :disabled="totalRows == 0" variant="primary" text="Export" size="sm">
                   <b-dropdown-item size="sm" :href="exportCsvUri">CSV</b-dropdown-item>
                </b-dropdown>
            </b-button-group>
            <b-button-group size="sm" class="m-2">
                <b-btn variant="danger" :href="closeUri"><span v-b-tooltip title="Close" class="fa fa-times"/></b-btn>
            </b-button-group>
        </b-button-toolbar>
        <b-table hover small bordered responsive v-bind="$data" class="m-1"></b-table>
        <div class="row">
            <div class="col-1" v-if="busy">
                <span class="fa fa-spinner fa-pulse fa-3x fa-fw"></span>
            </div>
            <div class="col-1" v-if="isQuery">
                <b-pagination :total-rows="totalRows" :per-page="perPage" v-model="currentPage" size="sm"/>
            </div>
            <div v-if="isQuery" class="mt-2 ml-5">
                <span class="col-6">Count: {{sqlStatement.executionCount}}</span>
                <span class="col-7">Time: {{sqlStatement.executionTime}}ms</span>
                <span class="col-8">Rows: {{totalRows}}</span>
                <span class="col-9">More?: {{sqlStatement.moreRows}}</span>
            </div>
            <div v-if="!isQuery" class="mt-2 ml-5">
                <span class="col-6">Count: {{sqlStatement.executionCount}}</span>
                <span class="col-7">Time: {{sqlStatement.executionTime}}ms</span>
                <span class="col-8">Rows Affected: {{sqlStatement.updateCount}}</span>
            </div>
        </div>
    </b-container>
</b-container>
`,
    data: function () {
        return {
            fields: [],
            items: [],
            headVariant: 'light',
            showEmpty: true,
            currentPage: 1,
            perPage: 20,
            pageOptions: [5, 20, 100],
            sortBy: null,
            sortDesc: false,
            filter: null,
            busy: true,
            sqlStatement: null,
            port: null
        }
    },
    computed: {
        totalRows: function () { return this.items.length; },
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
        if (this.sqlStatement.columns) {
            this.fields = this.sqlStatement.columns.map((name) => {
                return { key: name, label: name, sortable: true }
            })
            this.busy = false
        }
        if (this.sqlStatement.rows) {
            this.items = this.sqlStatement.rows.map((row) => {
                var result = {}
                row.forEach((val, ndx) => {
                    result[this.sqlStatement.columns[ndx]] = val
                })
                return result
            })
        }
    }
})