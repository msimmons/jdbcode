import { expect } from 'chai'
import 'mocha'
import { Grammar }from '../../src/sql_grammar'

let separated = `
select * from foo;

insert foo into bar
where foo = 8;

insert ';' into foo;
delete from foo;

delete from bar
`
describe('A SQL Grammar', () => {

    it('Parses separated statements', () => {
        let result = Grammar.Statements.tryParse(separated)
        expect(result.length).to.be.eq(9)
        
    })

    it('Parses identifiers', () => {
        [
            'simple',
            'schema.simple',
            'db..simple',
            '"quoted"',
            '"schema"."object"',
            '"mixed".db.table'
        ].forEach(id => {
            let result = Grammar.Identifier.tryParse(id)
            console.log(result)
        })
    })

    it('Parses literals', () => {
        [
            'true',
            'TRUE',
            'false',
            'NULL',
            "'String literal'",
            '32.45'
        ].forEach(id => {
            let result = Grammar.Literal.tryParse(id)
            console.log(result)
        })
    })

    it('Parses select items', () => {
        [
            'col1',
            'col1 as foo',
            'col1 foo',
            'col1 "foo"',
            'col1 as "foo"',
            '"col1" as "foo"',
            "func()",
            "func(1,2)",
            "(group by 3 order by 8)",
            "(partition by substr('',3) order by foo) as bar"
        ].forEach(id => {
            let result = Grammar.SelectItem.tryParse(id)
            console.log(result)
        })
    })

    it('Parses select statement', () => {
        [
            'select col1 from table',
            'select col1 as foo from table',
            'select col1 foo from table',
            'select col1 "foo as" from table',
            'select col1, col2 from table',
            'select col1 al1, col2 "foo" from table',
            'select a.* as a from foo a',
            "select (partition by substr('',3) order by foo) as bar from table"
        ].forEach(id => {
            let result = Grammar.SelectStatement.tryParse(id)
            console.log(result)
        })
    })
})

