var vm = new Vue({
    el: '#app',
    template: `
    <div class="container-fluid">
    <table class="results table-hover table-condensed table-bordered ">
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
                        {label: 'references', name: 'references'}
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
            headers: [],
            rows: [],
            busy: true,
            dbObject: {}
        }
    },
    computed: {
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
        }
    },
    created: function () {
        this.dbObject = window['db-object']
        this.headers = this.headerMap[this.dbObject.type].headers
        let rowProperty = this.headerMap[this.dbObject.type].rowProperty
        this.rows = this.createRows(this.headers, this.dbObject[rowProperty])
        this.busy = (typeof this.dbObject.rows === 'undefined') || !this.dbObject.rows
    }
})