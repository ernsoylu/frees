grammar Ees;

program
    : sep? (statement (sep statement)* sep?)? EOF
    ;

sep
    : (SEMI | NEWLINE)+
    ;

statement
    : duplicateBlock
    | equation
    ;

duplicateBlock
    : DUPLICATE IDENT EQ expr COMMA expr sep statementList sep? END
    ;

statementList
    : (statement (sep statement)*)?
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
    : NUMBER unit?                           # NumberAtom
    | IDENT LPAREN argList RPAREN            # CallAtom
    | IDENT LBRACKET arrayIndexList RBRACKET # ArrayAtom
    | IDENT                                  # VarAtom
    | LBRACKET argList RBRACKET              # ArrayLiteralAtom
    | LPAREN expr RPAREN                     # ParenAtom
    ;

argList
    : expr (COMMA expr)*
    ;

arrayIndexList
    : arrayIndex (COMMA arrayIndex)*
    ;

arrayIndex
    : expr (DOTDOT expr)?
    ;

unit
    : LBRACKET unitContent RBRACKET
    ;

unitContent
    : (IDENT | NUMBER | TIMES | DIV | CARET | MINUS | PLUS | COMMA | LPAREN | RPAREN)*
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
LBRACKET: '[' ;
RBRACKET: ']' ;
DOTDOT  : '..' ;

DUPLICATE : [dD][uU][pP][lL][iI][cC][aA][tT][eE] ;
END       : [eE][nN][dD] ;

NUMBER
    : DIGIT+ ('.' DIGIT+)? EXPONENT?
    | '.' DIGIT+ EXPONENT?
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

