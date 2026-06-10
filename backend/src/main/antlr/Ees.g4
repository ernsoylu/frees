grammar Ees;

program
    : sep? (equation (sep equation)* sep?)? EOF
    ;

sep
    : (SEMI | NEWLINE)+
    ;

equation
    : expr EQ expr
    ;

expr
    : addExpr
    ;

addExpr
    : mulExpr ((PLUS | MINUS) mulExpr)*
    ;

mulExpr
    : unaryExpr ((TIMES | DIV) unaryExpr)*
    ;

unaryExpr
    : MINUS unaryExpr
    | PLUS unaryExpr
    | powExpr
    ;

powExpr
    : atom (CARET unaryExpr)?
    ;

atom
    : NUMBER UNIT?                    # NumberAtom
    | IDENT LPAREN argList RPAREN     # CallAtom
    | IDENT                           # VarAtom
    | LPAREN expr RPAREN              # ParenAtom
    ;

argList
    : expr (COMMA expr)*
    ;

EQ      : '=' ;
PLUS    : '+' ;
MINUS   : '-' ;
TIMES   : '*' ;
DIV     : '/' ;
CARET   : '^' ;
LPAREN  : '(' ;
RPAREN  : ')' ;
COMMA   : ',' ;
SEMI    : ';' ;

NUMBER
    : DIGIT+ ('.' DIGIT*)? EXPONENT?
    | '.' DIGIT+ EXPONENT?
    ;

UNIT
    : '[' ~[\]\r\n]* ']'
    ;

IDENT
    : [a-zA-Z] [a-zA-Z0-9_]*
    ;

NEWLINE
    : ('\r'? '\n')+
    ;

BRACE_COMMENT
    : '{' .*? '}' -> skip
    ;

QUOTE_COMMENT
    : '"' .*? '"' -> skip
    ;

LINE_COMMENT
    : '//' ~[\r\n]* -> skip
    ;

WS
    : [ \t]+ -> skip
    ;

fragment DIGIT
    : [0-9]
    ;

fragment EXPONENT
    : [eE] [+-]? DIGIT+
    ;
