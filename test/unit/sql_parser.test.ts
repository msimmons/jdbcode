import { expect } from 'chai'
import 'mocha'
import { SqlParser }from '../../src/sql_parser'

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
describe('A SQL Parser', () => {

    describe('findStatements', () => {

        it('finds all the statements', () => {
            let parser = new SqlParser()
            let result = parser.findStatements(separated)
            expect(result).eql([
                { sql: 'select * from foo', start: 1, end: 18 },
                { sql: 'insert foo into bar\nwhere foo = 8', start: 21, end: 54 },
                { sql: "insert ';' into foo", start: 57, end: 76 },
                { sql: 'delete from foo', start: 78, end: 93 },
                { sql: 'delete from bar', start: 96, end: 111 },
                { sql: 'delete from foo', start: 113, end: 128 },
                {
                  sql: '--\n-- Try it with comments\n--\nselect foo from bar',
                  start: 130,
                  end: 179
                },
                { sql: 'select baz from biz', start: 181, end: 200 },
                {
                  sql: "-- It's good\ndelete from good where x = '''hello'';'",
                  start: 203,
                  end: 255
                }
            ])
        })
    })

})

