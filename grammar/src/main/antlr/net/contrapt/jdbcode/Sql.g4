grammar Sql;

statement 
 : select_statement | dml_statement | ddl_statement
 ;

dml_statement
 : insert_statement | update_statement | delete_statement
 ;

ddl_statement
 : 
 ;

select_statement
 : K_SELECT (K_DISTINCT)? select_list
   (K_FROM table_list)?
   (K_WHERE where_clause)?
   (K_GROUP K_BY group_clause)?
   (compound_operator select_statement)*
   (K_ORDER K_BY order_clause)?
 ;

compound_operator
 : K_UNION
 | K_UNION K_ALL
 | K_INTERSECT
 | K_MINUS
 ;

insert_statement
 : K_INSERT K_INTO table_expr
   insert_list?
   values_list
 ;

update_statement
 : K_UPDATE table_expr
   K_SET set_clause 
   (K_WHERE where_clause)?
 ;

delete_statement
 : K_DELETE K_FROM table_expr 
   (K_WHERE where_clause)?
 ;

upsert_statement
 : K_UPDATE
 ;

owner_name
 : IDENTIFIER
 ;

table_name
 : IDENTIFIER
 ;

alias_name
 : IDENTIFIER
 ;

column_name
 : IDENTIFIER
 | '*'
 ;

column_alias
 : IDENTIFIER
 | STRING_LITERAL
 ;

function_name
 : IDENTIFIER
 ;

table_expr
 : ( owner_name '.' )? table_name
 ;

table_item
 : table_expr ( K_AS? alias_name )?
 | '(' select_statement ')' K_AS? alias_name
 ;

table_list
 : table_item ( ',' table_item | join_operator table_item join_constraint )*
 ;

join_operator
 : K_NATURAL? ( K_LEFT K_OUTER? | K_INNER | K_CROSS )? K_JOIN
 ;

join_constraint
 : ( K_ON value_expr
   | K_USING '(' column_expr ( ',' column_expr )* ')' )?
 ;

select_list
 : select_item (',' select_item)*
 ;

select_item
 : value_expr ( K_AS? column_alias)?
 ;

column_expr
 : (alias_name '.')? column_name
 ;

//sum(decode(col1, null, 0, 1)) over (partition by name)
//case col1=3 'foo' else 'bar' end
value_expr
 : literal_value
 | column_expr
 | unary_operator value_expr
 | value_expr operator value_expr
 | value_expr IDENTIFIER value_expr
 | function_name '(' ( value_expr ( ',' value_expr )* )? ')'
 | function_name '(' value_expr ( value_expr )* ')'
 | value_expr value_expr
 ;

where_clause
 : value_expr+
 ;

insert_list
 : '(' column_expr (',' column_expr)* ')'
 ;

values_list
 : K_VALUES '(' value_expr (',' value_expr)* ')'
 | select_statement
 ;

set_clause
 : column_expr '=' value_expr (',' column_expr '=' value_expr)*
 ;

order_direction
 : K_ASC
 | K_DESC
 ;

order_expr
 : NUMERIC_LITERAL order_direction?
 | value_expr order_direction?
 ;

order_clause
 : order_expr (',' order_expr)*
 ;

group_clause
 : value_expr+
 ;

operator
 : '||'
 | ('*'|'/'|'%')
 | ('=' | '<' | '>'| '<='| '>='| '!='| '<>')
 | (K_IS | K_IS K_NOT | K_IN | K_LIKE | K_AND | K_OR | K_BY)
 ;

unary_operator
 : '-'
 | '+'
 | '~'
 | K_NOT
 ;

literal_value
 : NUMERIC_LITERAL
 | STRING_LITERAL
 | BLOB_LITERAL
 | K_NULL
 ;

K_ALL : A L L;
K_AND : A N D;
K_AS : A S;
K_ASC : A S C;
K_BEGIN : B E G I N;
K_BETWEEN : B E T W E E N;
K_BY : B Y;
K_CASE : C A S E;
K_CAST : C A S T;
K_CHECK : C H E C K;
K_CONFLICT : C O N F L I C T;
K_CROSS : C R O S S;
K_DEFAULT : D E F A U L T;
K_DELETE : D E L E T E;
K_DESC : D E S C;
K_DISTINCT : D I S T I N C T;
K_EACH : E A C H;
K_ELSE : E L S E;
K_END : E N D;
K_ESCAPE : E S C A P E;
K_EXCEPT : E X C E P T;
K_EXISTS : E X I S T S;
K_FOR : F O R;
K_FROM : F R O M;
K_GROUP : G R O U P;
K_HAVING : H A V I N G;
K_IF : I F;
K_IN : I N;
K_INNER : I N N E R;
K_INSERT : I N S E R T;
K_INTERSECT : I N T E R S E C T;
K_INTO : I N T O;
K_IS : I S;
K_ISNULL : I S N U L L;
K_JOIN : J O I N;
K_KEY : K E Y;
K_LEFT : L E F T;
K_LIKE : L I K E;
K_LIMIT : L I M I T;
K_MATCH : M A T C H;
K_MINUS : M I N U S;
K_NATURAL : N A T U R A L;
K_NO : N O;
K_NOT : N O T;
K_NOTNULL : N O T N U L L;
K_NULL : N U L L;
K_OF : O F;
K_OFFSET : O F F S E T;
K_ON : O N;
K_OR : O R;
K_ORDER : O R D E R;
K_OUTER : O U T E R;
//K_OVER : O V E R;
//K_PARTITION : P A R T I T I T I O N;
K_REGEXP : R E G E X P;
K_RIGHT : R I G H T;
K_SELECT : S E L E C T;
K_SET : S E T;
K_THEN : T H E N;
K_TO : T O;
K_UNION : U N I O N;
K_UPDATE : U P D A T E;
K_USING : U S I N G;
K_VALUES : V A L U E S;
K_WHEN : W H E N;
K_WHERE : W H E R E;
K_WITH : W I T H;
K_WITHOUT : W I T H O U T;

IDENTIFIER
 : '"' (~'"' | '""')* '"'
 | '`' (~'`' | '``')* '`'
 | '[' ~']'* ']'
 | [a-zA-Z_] [a-zA-Z_0-9$]* // TODO check: needs more chars in set
 ;

NUMERIC_LITERAL
 : DIGIT+ ( '.' DIGIT* )? ( E [-+]? DIGIT+ )?
 | '.' DIGIT+ ( E [-+]? DIGIT+ )?
 ;

BIND_PARAMETER
 : '?' DIGIT*
 | [:@$] IDENTIFIER
 ;

STRING_LITERAL
 : '\'' ( ~'\'' | '\'\'' )* '\''
 ;

BLOB_LITERAL
 : X STRING_LITERAL
 ;

SINGLE_LINE_COMMENT
 : '--' ~[\r\n]* -> channel(HIDDEN)
 ;

MULTILINE_COMMENT
 : '/*' .*? ( '*/' | EOF ) -> channel(HIDDEN)
 ;

SPACES
 : [ \u000B\t\n\r] -> channel(HIDDEN)
 ;

UNEXPECTED_CHAR
 : .
 ;

fragment DIGIT : [0-9];

fragment A : [aA];
fragment B : [bB];
fragment C : [cC];
fragment D : [dD];
fragment E : [eE];
fragment F : [fF];
fragment G : [gG];
fragment H : [hH];
fragment I : [iI];
fragment J : [jJ];
fragment K : [kK];
fragment L : [lL];
fragment M : [mM];
fragment N : [nN];
fragment O : [oO];
fragment P : [pP];
fragment Q : [qQ];
fragment R : [rR];
fragment S : [sS];
fragment T : [tT];
fragment U : [uU];
fragment V : [vV];
fragment W : [wW];
fragment X : [xX];
fragment Y : [yY];
fragment Z : [zZ];