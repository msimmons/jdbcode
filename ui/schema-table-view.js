var vm = new Vue({
    el: '#app',
    template: `
    <div class="container-fluid" >
    <table class="table table-hover table-sm table-bordered table-striped">
        <thead>
            <th nowrap class="results">name</th>
            <th nowrap class="results">type</th>
            <th nowrap class="results">size</th>
            <th nowrap class="results">default</th>
            <th nowrap class="results">null?</th>
            <th nowrap class="results">auto?</th>
            <th nowrap class="results">references</th>
        </thead>
        <tbody>
            <tr v-for="column in dbObject.resolved.columns">
                <td nowrap class="results">
                  {{column.name}}
                  <span v-if="column.keySequence" :title="column.keySequence" class="fa fa-key">
                </td>
                <td nowrap class="results">{{column.type}}</td>
                <td nowrap class="results">{{column.size}}</td>
                <td nowrap class="results">{{column.default}}</td>
                <td nowrap class="results">{{column.nullable}}</td>
                <td nowrap class="results">{{column.autoincrement}}</td>
                <td nowrap class="results">{{column.references}}</td>
                <td width="30" nowrap class="result" v-for="index in column.indices" :title="indexTitle(index)">
                    <i :class="indexClass(index)">{{index.position}}</i>
                </td>
            </tr>
        </tbody>
    </table>
    </div>
`,
    data: function () {
        return {
            dbObject: {},
            badgeClasses: ['primary', 'success', 'info', 'warning', 'danger', 'default']
        }
    },
    computed: {
    },
    methods: {
        commandUri: function(command) {
            var id = this.sqlStatement.id
            return encodeURI('command:jdbcode.'+command+'?'+ JSON.stringify([id]))
        },
        indexClass: function(index) {
            let i = this.dbObject.resolved.indices.findIndex((name) => { return name === index.name })
            return 'result badge badge-pill badge-' + this.badgeClasses[i]
        },
        indexTitle: function(index) {
            let unique = index.unique ? 'unique' : ''
            return `${index.name}(${unique} ${index.direction})`
        }
    },
    created: function () {
        this.dbObject = window['db-object']
    }
})