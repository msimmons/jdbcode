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

delete from foo

--
-- Try it with comments
--
select foo from bar;
select baz from biz;

-- It's good
delete from good where x = '''hello'';';

`
describe('A SQL Grammar', () => {

    describe('Separated Statements', () => {

        it('Parses separated statements', () => {
            let result = Grammar.Statements.tryParse(separated)
            let sqls = result.filter(r => r.name === 'SQL')
            expect(sqls.length).eql(9)
            expect(sqls[0].value).eql('select * from foo')
            expect(sqls[1].value).eql('insert foo into bar\nwhere foo = 8')
            expect(sqls[2].value).eql("insert ';' into foo")
            expect(sqls[3].value).eql("delete from foo")
            expect(sqls[4].value).eql("delete from bar")
            expect(sqls[5].value).eql("delete from foo")
            expect(sqls[6].value).eql("--\n-- Try it with comments\n--\nselect foo from bar")
            expect(sqls[7].value).eql("select baz from biz")
            expect(sqls[8].value).eql("-- It\'s good\ndelete from good where x = '''hello'';'")
        })
    })

    describe('Individual Statment Components', () => {
        it('Parses identifiers', () => {
            [
                {id: 'simple', value: 'simple'},
                {id: 'schema.simple', value: 'schema.simple'},
                {id: 'db..simple', value: 'db.simple'},
                {id: '"quoted"', value: 'quoted'},
                {id: '"schema"."object"', value: 'schema.object'},
                {id: '"mixed".db.table', value: 'mixed.db.table'}
            ].forEach(id => {
                let result = Grammar.Identifier.tryParse(id.id)
                console.log(result)
                expect(result.value).eql(id.value)
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
                expect(result.value).eql(id)
                console.log(result)
            })
        })
    
        it ('Parses function expressions', () => {
            [
                'func(col1, col2)'
            ].forEach(id => {
                let result = Grammar.FunctionExpression.tryParse(id)
                console.log(JSON.stringify(result, undefined, 2))
            })
        })

        it ('Parses value expressions', () => {
            [
                '(col1 (col3 by col4) col2)',
                '(col1 func(2, a))',
                'func(1,(partion by foo))'
            ].forEach(id => {
                let result = Grammar.ValueExpression.tryParse(id)
                console.log(JSON.stringify(result, undefined, 2))
            })
        })

        it ('Parses new value expressions', () => {
            [
                'case when a=b then 1 else 0 end',
                '(col1 (col3 by col4) col2) over (partition by id order by userid, something)',
            ].forEach(id => {
                let result = Grammar.ValueStatement.tryParse(id)
                console.log(JSON.stringify(result, undefined, 2))
            })
        })

        it ('Parses a select item', () => {
            let result = Grammar.SelectItem.tryParse('col1 as foo')
            console.log(JSON.stringify(result, undefined, 2))
        })

        it('Parses select item', () => {
            [
                'col1',
                'col1 as foo',
                'col1 foo',
                'col1 "foo"',
                'col1 as "foo"',
                '"col1" as "foo"',
                'my.tab1.col1 ali',
                "func()",
                "func(1,2)",
                "(group by 3 order by 8)",
                "(partition by substr('',3) order by foo) as bar",
                "(select foo from bar) boo"
            ].forEach(id => {
                let result = Grammar.SelectItem.tryParse(id)
                //console.log(result)
                console.log(JSON.stringify(result, undefined, 2))
            })
        })

        it('Parses select items', () => {
            [
                'col1, col2',
                'col1 as foo',
                'col1 foo',
                'col1 "foo"',
                'col1 as "foo"',
                '"col1" as "foo"',
                'my.tab1.col1 ali',
                "func()",
                "func(1,2)",
                "(group by 3 order by 8)",
                "(partition by substr('',3) order by foo) as bar, col2 as foo",
                "(select foo from bar) boo"
            ].forEach(id => {
                let result = Grammar.SelectItems.tryParse(id)
                //console.log(result)
                console.log(JSON.stringify(result, undefined, 2))
            })
        })

        it('Parses table items', () => {
            [
                'table1',
                'table1 foo',
                'table1 "foo"'
            ].forEach(id => {
                let result = Grammar.TableItem.tryParse(id)
                console.log(JSON.stringify(result, undefined, 2))
            })
        })
    })

    describe("Select Statements", () => {

        it('Parses select statement', () => {
            [
                'select col1 from table',
                'select c from t where a=b and substr(a, 3) = \'hii\' order by fun',
                'select col1 as foo from table',
                'select col1 foo from table',
                'select col1 "foo as" from table',
                'select col1, col2 from table',
                'select col1 al1, col2 "foo" from table',
                'select a.* as a from foo a',
                "select (partition by substr('',3) order by foo) as bar from table",
                "select case when a=b then 1 else 0 end foo from bar"
            ].forEach(id => {
                console.log(id)
                let result = Grammar.SelectStatement.tryParse(id)
                console.log(JSON.stringify(result, undefined,2))
            })
        })
    })
})

