import * as P from 'parsimmon'
import { Node } from 'parsimmon';

/** A custom parser to separate all the sql statments in a file */
function statementContents() {
    return P((input, i) => {
        let parenCount = 0
        let inQuote = false
        let pos = 0
        for (pos=i; pos < input.length; pos++) {
            let c = input.charAt(pos)
            let next = pos < input.length-1 ? input.charAt(pos+1) : undefined
            if (c === '(') parenCount++
            if (c === ')') parenCount--
            if (['"', "'"].includes(c)) inQuote = !inQuote
            if (c === ';' && !inQuote) break
            if (c === '\n' && next === '\n' && parenCount === 0 && !inQuote) break
        }
        let result = input.substring(i, pos)
        if (i != pos) return P.makeSuccess(pos, result)
        else return P.makeFailure(pos+1, 'EOF')
    });
}

export const Grammar = P.createLanguage<{
    _: string
    __: string
    Separator: Node<'Separator', string>
    StatementContent: Node<'SQL',string>
    Statements: string[]

    STRING_LITERAL: string
    NUMERIC_LITERAL: string
    ID: string
    QID: string
    WILDCARD: string
    Keyword: string
    SimpleId: Node<'SimpleId', string>
    Identifier: Node<'Id', string[]>
    Literal: Node<'Literal', string>
    FunctionParams: Node<'Value', any>[]
    FunctionExpression: Node<'Function', any>
    BlockExpression: Node<'Block', any>
    ValueExpression: Node<'Value', any>
    AsAlias: Node<'Alias', string>
    Alias: Node<'Alias', string[]>
    SelectItem: Node<'SelectItem', any>
    SelectItems: Node<'SelectItem', any>[]
    SelectStatement: Node<'Select', any>
}>({
    _: () => P.optWhitespace,
    __: () => P.whitespace,
    Separator: () => P.string(';').node('Separator'),
    StatementContent: (r) => statementContents().node('SQL'),
    Statements: (r) => P.alt(r.Separator, r.StatementContent).trim(r._).atLeast(1),

    STRING_LITERAL: () => P.regexp(/'([^']|'')*'/),
    NUMERIC_LITERAL: () => P.regexp(/([-]?[0-9]+(\.[0-9]*)?(E[-+]?[0-9]+)?)|([-]?\.[0-9]+(E[-+]?[0-9]+)?)/),
    ID: () => P.regexp(/[A-Za-z]\w*/),
    QID: () => P.regexp(/[^\"]*/).wrap(P.string('"'), P.string('"')),
    WILDCARD: () => P.string('*'),

    Keyword: (r) => P.regexp(/from|where|order/i),
    SimpleId: (r) => P.alt(P.lookahead(r.Keyword), r.QID, r.ID).node('SimpleId'),
    Identifier: (r) => P.sepBy1(P.alt(r.WILDCARD, r.ID, r.QID), P.regexp(/\.+/)).trim(r._).node('Id'),
    Literal: (r) => P.alt(P.regexp(/true|false|null/i), r.NUMERIC_LITERAL, r.STRING_LITERAL).trim(r._).node('Literal'),

    AsAlias: (r) => P.seq(P.regexp(/as/i), r.__, r.SimpleId).map(id => id[2].value).node('Alias'),
    Alias: (r) => P.alt(r.AsAlias, r.SimpleId).node('Alias'),

    FunctionParams: (r) => P.sepBy(r.ValueExpression, P.string(',')),
    FunctionExpression: (r) => P.seq(r.Identifier, r.FunctionParams.wrap(P.string('('), P.string(')'))).trim(r._).node('Function'),
    BlockExpression: (r) => r.ValueExpression.atLeast(1).wrap(P.string('('), P.string(')')).node('Block'),
    ValueExpression: (r) => P.alt(r.BlockExpression, r.FunctionExpression, r.Literal, r.Identifier).trim(r._).node('Value'),

    SelectItem: (r) => P.seq(r.ValueExpression, r.Alias.atMost(1)).trim(r._).node('SelectItem'),
    SelectItems: (r) => P.sepBy1(r.SelectItem, P.string(',')),

    SelectStatement: (r) => P.seq(P.regexp(/select/i), r.__, r.SelectItems, P.regexp(/from/i), r.__, r.SelectItem).node('Select')

})