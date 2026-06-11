grammar Ees;

program
    : sep? (topLevel (sep topLevel)* sep?)? EOF
    ;

sep
    : (SEMI | NEWLINE)+
    ;

topLevel
    : functionDef
    | procedureDef
    | moduleDef
    | statement
    ;

// ── FUNCTION / PROCEDURE / MODULE definitions ─────────────────────────────────

functionDef
    : FUNCTION IDENT LPAREN paramList RPAREN sep
      procBody
      END
    ;

procedureDef
    : PROCEDURE IDENT LPAREN paramList COLON paramList RPAREN sep
      procBody
      END
    ;

moduleDef
    : MODULE IDENT LPAREN paramList COLON paramList RPAREN sep
      statementList sep?
      END
    ;

paramList
    : (IDENT (COMMA IDENT)*)?
    ;

// ── Procedural body (inside FUNCTION / PROCEDURE) ─────────────────────────────

procBody
    : (procStatement (sep procStatement)* sep?)?
    ;

procStatement
    : duplicateBlock
    | ifStatement
    | repeatStatement
    | assignment
    | equation
    ;

assignment
    : IDENT ASSIGN expr
    ;

ifStatement
    : IF boolExpr THEN sep
      procBody
      (ELSE sep procBody)?
      END
    ;

repeatStatement
    : REPEAT sep
      procBody
      UNTIL boolExpr
    ;

// ── Top-level statements ──────────────────────────────────────────────────────

statement
    : duplicateBlock
    | callStatement
    | equation
    ;

callStatement
    : CALL IDENT LPAREN callArgList COLON callArgList RPAREN
    ;

callArgList
    : (expr (COMMA expr)*)?
    ;

// ── Existing rules ─────────────────────────────────────────────────────────────

duplicateBlock
    : DUPLICATE IDENT EQ expr COMMA expr sep statementList sep? END
    ;

statementList
    : (statement (sep statement)*)?
    ;

equation
    : expr EQ expr
    ;

// ── Boolean / relational expressions (IF / REPEAT conditions) ─────────────────
// Left-recursive: ANTLR4 handles precedence by alternative order.

boolExpr
    : NOT boolExpr                                          # BoolNot
    | boolExpr AND boolExpr                                 # BoolAnd
    | boolExpr OR boolExpr                                  # BoolOr
    | LPAREN boolExpr RPAREN                                # BoolParen
    | expr (LT | GT | LE | GE | NEQ | EQ) expr             # BoolRel
    | expr                                                  # BoolTruthy
    ;

// ── Arithmetic expressions ─────────────────────────────────────────────────────

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
    | IMAG_NUMBER unit?                      # ImagNumberAtom
    | IDENT LPAREN argList RPAREN            # CallAtom
    | IDENT LBRACKET arrayIndexList RBRACKET # ArrayAtom
    | IDENT                                  # VarAtom
    | LBRACKET argList RBRACKET              # ArrayLiteralAtom
    | LPAREN expr RPAREN                     # ParenAtom
    ;

argList
    : arg (COMMA arg)*
    ;

// Named arguments (T=300) select fluid property inputs, EES-style:
// Enthalpy(R134a, T=T1, x=1)
arg
    : IDENT EQ expr   # NamedArg
    | expr            # PositionalArg
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

// ── Operators ──────────────────────────────────────────────────────────────────

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

// ASSIGN must be defined before COLON so ':=' beats ':'
ASSIGN  : ':=' ;
COLON   : ':' ;

// Relational operators (LE/GE before LT/GT to avoid single-char match)
LE      : '<=' ;
GE      : '>=' ;
NEQ     : '<>' ;
LT      : '<' ;
GT      : '>' ;

// ── Keywords (case-insensitive) ────────────────────────────────────────────────

DUPLICATE : [dD][uU][pP][lL][iI][cC][aA][tT][eE] ;
END       : [eE][nN][dD] ;
FUNCTION  : [fF][uU][nN][cC][tT][iI][oO][nN] ;
PROCEDURE : [pP][rR][oO][cC][eE][dD][uU][rR][eE] ;
MODULE    : [mM][oO][dD][uU][lL][eE] ;
IF        : [iI][fF] ;
THEN      : [tT][hH][eE][nN] ;
ELSE      : [eE][lL][sS][eE] ;
REPEAT    : [rR][eE][pP][eE][aA][tT] ;
UNTIL     : [uU][nN][tT][iI][lL] ;
CALL      : [cC][aA][lL][lL] ;
AND       : [aA][nN][dD] ;
OR        : [oO][rR] ;
NOT       : [nN][oO][tT] ;

// ── Literals & identifiers ─────────────────────────────────────────────────────

IMAG_NUMBER
    : DIGIT+ ('.' DIGIT+)? EXPONENT? [iIjJ]
    | '.' DIGIT+ EXPONENT? [iIjJ]
    ;

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
