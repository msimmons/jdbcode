//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { SqlParser } from '../src/sql_parser'

// Defines a Mocha test suite to group tests of similar kind together
suite("Parser Tests", () => {

    // Defines a Mocha unit test
    test("Parse a SQL statement", () => {
        let parser = new SqlParser()
        let sql = 'select a, b, c from dtable where a=c'
        for ( let i = 8; i < sql.length; i++ ) {
            let slice = sql.substring(0, i)
            let position = new vscode.Position(1, slice.length)
            console.log(slice)
            let result = parser.parse(slice, position)
            console.log(i+ ' ' +JSON.stringify(result))
        }
    });
});