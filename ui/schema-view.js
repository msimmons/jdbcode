var vm = new Vue({
    el: '#app',
    template: `
    <div class="container-fluid" >
    <table class="results table-hover table-condensed table-bordered" v-if="isTable">
        <thead>
            <th nowrap class="results">name</th>
            <th nowrap class="results">type</th>
            <th nowrap class="results">size</th>
            <th nowrap class="results">default</th>
            <th nowrap class="results">null?</th>
            <th nowrap class="results">auto?</th>
            <th nowrap class="results">references</th>
            <th nowrap class="results"></th>
        </thead>
        <tbody>
            <tr v-for="column in dbObject.columns">
                <td nowrap class="results">
                    {{column.name}}
                </td>
                <td nowrap class="results">{{column.type}}</td>
                <td nowrap class="results">{{column.size}}</td>
                <td nowrap class="results">{{column.default}}</td>
                <td nowrap class="results">{{column.nullable}}</td>
                <td nowrap class="results">{{column.autoincrement}}</td>
                <td nowrap class="results">{{column.references}}</td>
                <td nowrap class="results">
                    <span v-if="column.keySequence" class="fa fa-key" :title="column.keySequence"/>
                    <span v-for="index in column.indices" class="fa fa-filter" :title="indexInfo(index)">{{index.position}}</span>
                </td>
            </tr>
        </tbody>
    </table>
    </div>
    <div class="container-fluid" v-if="!isTable">
    <table class="results table-hover table-condensed table-bordered" >
        <thead>
            <th nowrap class="results" v-for="header in headers">{{header.label}}</th>
        </thead>
        <tbody>
            <tr v-for="row in rows">
                <td nowrap class="results" v-for="value in row">{{value}}</td>
            </tr>
        </tbody>
    </table>
    </div>
`,
    data: function () {
        return {
            headerMap: {
                table: {
                    rowProperty: 'columns',
                    headers: [
                        {label: 'name', name: 'name'},
                        {label: 'type', name: 'type'},
                        {label: 'size', name: 'size'},
                        {label: 'default', name: 'default'},
                        {label: 'null?', name: 'nullable'},
                        {label: 'auto?', name: 'autoincrement'},
                        {label: 'pkey?', name: 'keySequence'},
                        {label: 'references', name: 'references'},
                        {label: 'indices', name: 'indices'}
                    ]
                },
                view: {
                    rowProperty: 'columns',
                    headers:                 [
                        {label: 'name', name: 'name'},
                        {label: 'type', name: 'type'},
                        {label: 'size', name: 'size'}
                    ],
                },
                sequence: {
                    rowProperty: 'columns',
                    headers:                 [
                        {label: 'name', name: 'name'},
                        {label: 'type', name: 'type'},
                        {label: 'size', name: 'size'}
                    ],
                },
                procedure: {
                    rowProperty: 'params',
                    headers: [
                        {label: 'name', name: 'name'},
                        {label: 'type', name: 'type'},
                        {label: 'in/out', name: 'inOut'},
                        {label: 'default', name: 'default'},
                        {label: 'null?', name: 'nullable'}
                    ]
                },
                index: {
                    rowProperty: 'columns',
                    headers: [
                        {label: 'name', name: 'name'},
                        {label: 'type', name: 'type'},
                        {label: 'in/out', name: 'inOut'},
                        {label: 'default', name: 'default'},
                        {label: 'null?', name: 'nullable'}
                    ]
                }
            },
            columns: [],
            headers: [],
            rows: [],
            busy: true,
            dbObject: {}
        }
    },
    computed: {
        isTable: function() {
            return this.dbObject.type === 'table'
        }
    },
    methods: {
        commandUri: function(command) {
            var id = this.sqlStatement.id
            return encodeURI('command:jdbcode.'+command+'?'+ JSON.stringify([id]))
        },
        createRows: function(headers, columns) {
            return columns.map((column) => {
                return headers.map((header) => {
                    return column[header.name]
                })
            })
        },
        indexInfo: function(index) {
            let unique = index.unique ? 'unique' : ''
            return `${index.name}(${index.position} ${unique} ${index.direction})`
        }
    },
    created: function () {
        this.dbObject = window['db-object']
        this.columns = this.dbObject.columns
        this.headers = this.headerMap[this.dbObject.type].headers
        let rowProperty = this.headerMap[this.dbObject.type].rowProperty
        this.rows = this.createRows(this.headers, this.dbObject[rowProperty])
        this.busy = (typeof this.dbObject.rows === 'undefined') || !this.dbObject.rows
    }
})