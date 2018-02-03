var vm = new Vue({
    el: '#app',
    template: `
    <div class="container-fluid" >
    <table class="results table-hover table-condensed table-bordered">
        <thead>
            <th nowrap class="results">name</th>
            <th nowrap class="results">type</th>
            <th nowrap class="results">in/out</th>
            <th nowrap class="results">default</th>
            <th nowrap class="results">null?</th>
        </thead>
        <tbody>
            <tr v-for="param in dbObject.params">
                <td nowrap class="results">{{param.name}}</td>
                <td nowrap class="results">{{param.type}}</td>
                <td nowrap class="results">{{param.inOut}}</td>
                <td nowrap class="results">{{param.default}}</td>
                <td nowrap class="results">{{param.nullable}}</td>
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