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

    ID: string
    QID: string
    Identifier: Node<'Id', string[]>
}>({
    _: () => P.optWhitespace,
    __: () => P.whitespace,
    Separator: () => P.string(';').node('Separator'),
    StatementContent: (r) => statementContents().node('SQL'),
    Statements: (r) => P.alt(r.Separator, r.StatementContent).trim(r._).atLeast(1),

    ID: () => P.regexp(/[A-Za-z]\w*/),
    QID: () => P.regexp(/[^\"]*/).wrap(P.string('"'), P.string('"')),
    Identifier: (r) => P.sepBy1(P.alt(r.ID, r.QID), P.regexp(/\.+/)).trim(r._).node('Id')

})