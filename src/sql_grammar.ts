import * as P from 'parsimmon'
import { Node } from 'parsimmon';

/** A custom parser to separate all the sql statments in a file */
function statementContents() {
    return P((input, i) => {
        let parenCount = 0
        let quotes = []
        let pos = 0
        for (pos=i; pos < input.length; pos++) {
            let c = input.charAt(pos)
            let next = pos < input.length-1 ? input.charAt(pos+1) : undefined
            if (c === '(') parenCount++
            if (c === ')') parenCount--
            if (['"', "'"].includes(c)) {
                if (quotes.length === 0) quotes.push(c)
                else if (quotes[0] === c && next != c) quotes.pop()
                else if (c === next) pos++
            }
            if (c === ';' && quotes.length === 0) break
            if (c === '\n') quotes.pop()
            if (c === '\n' && next === '\n' && parenCount === 0 && quotes.length === 0) break
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
    Statements: Node<'Separator'|'SQL', string>[]

    STRING_LITERAL: string
    NUMERIC_LITERAL: string
    ID: string
    WORD: string
    KEYWORD: string
    QID: string
    WILDCARD: string
    OPERATOR: string
    AliasKeyword: string
    AliasId: Node<'AliasId', string>
    Identifier: Node<'Identifier', string>
    Literal: Node<'Literal', string>
    FunctionParams: Node<'FunctionParams', any[]>
    FunctionExpression: Node<'FunctionExpression', any>
    BlockValue: Node<'BlockValue', any>
    BlockExpression: Node<'Block', any>
    BlockValueExpression: Node<'BlockValueExpression', any>
    BlockValueStatement: Node<'BlockValueStatement', any>
    ValueExpression: Node<'ValueExpression', any>
    ValueStatement: Node<'ValueStatement', any>
    AsAlias: Node<'Alias', string>
    Alias: Node<'Alias', string>
    SelectItem: Node<'SelectItem', any>
    SelectItems: Node<'SelectItem', any>[]
    TableItem: Node<'TableItem', any>
    TableItems: Node<'TableItem', any>[]
    WhereItem: Node<'WhereItem', any>
    WhereClause: Node<'WhereClause', any>
    OrderClause: Node<'OrderClause', any>
    SelectStatement: Node<'Select', any>
}>({
    _: () => P.optWhitespace,
    __: () => P.whitespace,
    Separator: () => P.string(';').node('Separator'),
    StatementContent: (r) => statementContents().node('SQL'),
    Statements: (r) => P.alt(r.Separator, r.StatementContent).trim(r._).atLeast(1),

    STRING_LITERAL: () => P.regexp(/'([^']|'')*'/),
    NUMERIC_LITERAL: () => P.regexp(/([-]?[0-9]+(\.[0-9]*)?(E[-+]?[0-9]+)?)|([-]?\.[0-9]+(E[-+]?[0-9]+)?)/),
    WORD: () => P.regexp(/[A-Za-z]\w*/),
    KEYWORD: (r) => P.regexp(/as|from|where|order|group|select|insert|delete/i),
    ID: () => P.regexp(/^(?!(as|from|join|where|order|group|select|insert|delete)\b)[A-Za-z]\w*/i),
    QID: () => P.regexp(/[^\"]*/).wrap(P.string('"'), P.string('"')),
    WILDCARD: () => P.string('*'),
    OPERATOR: () => P.regexp(/[+-/*!|=]*/),

    Identifier: (r) => P.sepBy1(P.alt(r.WILDCARD, r.QID, r.ID), P.regexp(/\.+/)).trim(r._).node('Identifier').map(mapIdentifier),
    Literal: (r) => P.alt(P.regexp(/true|false|null/i), r.NUMERIC_LITERAL, r.STRING_LITERAL).trim(r._).node('Literal').map(mapLiteral),

    AliasKeyword: (r) => P.regexp(/join|from|where|order|group/i),
    AliasId: (r) => P.alt(P.lookahead(r.AliasKeyword), r.QID, r.ID).node('AliasId'),
    AsAlias: (r) => P.seq(P.regexp(/as/i), r.__, r.AliasId).map(id => id[2].value).node('Alias'),
    Alias: (r) => P.alt(r.AsAlias, r.AliasId).map(id => id.value).node('Alias'),

    FunctionParams: (r) => P.sepBy(r.BlockValueStatement, P.string(',')).node('FunctionParams'),
    FunctionExpression: (r) => P.seq(r.Identifier, r.FunctionParams.wrap(P.string('('), P.string(')'))).trim(r._).node('FunctionExpression').map(mapFunctionExpression),

    BlockValue: (r) => P.sepBy1(r.BlockValueStatement, P.string(',')).trim(r._).node('BlockValue').map(mapBlockValue),
    BlockExpression: (r) => r.BlockValue.atLeast(1).wrap(P.string('('), P.string(')')).node('Block').map(mapBlockExpression),
    BlockValueExpression: (r) => P.alt(r.BlockExpression, r.FunctionExpression, r.Literal, r.WORD).trim(r._).node('BlockValueExpression').map(mapValueExpression),
    BlockValueStatement: (r) => P.sepBy1(r.BlockValueExpression, r.OPERATOR).trim(r._).node('BlockValueStatement').map(mapValueStatement),

    ValueExpression: (r) => P.alt(r.BlockExpression, r.FunctionExpression, r.Literal, r.Identifier).trim(r._).node('ValueExpression').map(mapValueExpression),
    ValueStatement: (r) => P.sepBy1(r.ValueExpression, r.OPERATOR).trim(r._).node('ValueStatement').map(mapValueStatement),

    SelectItem: (r) => P.seq(r.ValueStatement, r.Alias.atMost(1)).trim(r._).node('SelectItem').map(mapSelectItem),
    SelectItems: (r) => P.sepBy1(r.SelectItem, P.string(',')),
    TableItem: (r) => P.seq(r.Identifier, r.Alias.atMost(1)).trim(r._).node('TableItem'),
    TableItems: (r) => P.sepBy1(r.TableItem, P.string(',')),

    WhereItem: (r) => P.seq(r.ValueStatement, P.regexp(/=/), r.ValueExpression).trim(r._).node('WhereItem'),
    WhereClause: (r) => P.seq(P.regexp(/where/i), r.__, P.sepBy1(r.ValueStatement, P.regexp(/and/i))).node('WhereClause'),
    OrderClause: (r) => P.seq(P.regexp(/order by/i), r.__, P.sepBy1(r.ValueExpression, P.string(','))).node('OrderClause'),

    SelectStatement: (r) => P.seq(P.regexp(/select/i), r.__, r.SelectItems, P.regexp(/from/i), r.__, r.TableItems, r.WhereClause.atMost(1), r.OrderClause.atMost(1)).node('Select')

})

function mapIdentifier(identifier) : any {
    return {type: identifier.name, value: identifier.value.join('.'), start: identifier.start.offset, end: identifier.end.offset}
}

function mapLiteral(literal) : any {
    return {type: literal.name, value: literal.value, start: literal.start.offset, end: literal.end.offset}
}

function mapFunctionExpression(functionExpression) : any {
    return [functionExpression.value[0]].concat(functionExpression.value[1].value.reduce((a, v) => a.concat(v), []))
}

function mapBlockValue(blockValue) : any {
    return blockValue.value.reduce((a, v) => a.concat(v), []);
}

function mapBlockExpression(blockExpression) : any {
    return blockExpression.value.reduce((a, v) => a.concat(v), []);
}

function mapValueExpression(valueExpression) : any {
    //console.log(valueExpression.name, valueExpression.value)
    switch(valueExpression.name) {
        case "Identifier":
            return valueExpression.value
        case "Block":
            return valueExpression.value.reduce((a, v) => a.concat(v), [])
        case "FunctionExpression":
            return [valueExpression[0].value].concat(valueExpression[1].value.reduce((a, v) => a.concat(v), []))
        default:
            return valueExpression.value
    }
}

function mapValueStatement(valueStatement) : any {
    return valueStatement.value.reduce((a, v) => a.concat(v), []);
}

function mapSelectItem(result) : any {
    //console.log(JSON.stringify(result, undefined, 2))
    let alias = result.value[1].length ? result.value[1][0].value : undefined
    let ids = Array.isArray(result.value[0].value) ? result.value[0].value : [result.value[0]];
    return {type: result.name, ids: ids, alias: alias, start: result.start.offset, end: result.end.offset}
}
