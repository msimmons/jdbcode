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
})

