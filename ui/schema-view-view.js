var vm = new Vue({
    el: '#app',
    template: `
    <div class="container-fluid" >
    <table class="results table-hover table-condensed table-bordered">
        <thead>
            <th nowrap class="results">name</th>
            <th nowrap class="results">type</th>
            <th nowrap class="results">size</th>
        </thead>
        <tbody>
            <tr v-for="column in dbObject.columns">
                <td nowrap class="results">{{column.name}}</td>
                <td nowrap class="results">{{column.type}}</td>
                <td nowrap class="results">{{column.size}}</td>
            </tr>
        </tbody>
    </table>
    </div>
`,
    data: function () {
        return {
            dbObject: {}
        }
    },
    computed: {
    },
    methods: {
        commandUri: function(command) {
            var id = this.sqlStatement.id
            return encodeURI('command:jdbcode.'+command+'?'+ JSON.stringify([id]))
        }
    },
    created: function () {
        this.dbObject = window['db-object']
    }
})