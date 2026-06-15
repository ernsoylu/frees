grammar Frees;

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
    | tableDef
    | parametricDef
    | plotDef
    | statement
    ;

// ── FUNCTION / PROCEDURE / MODULE definitions ─────────────────────────────────

functionDef
    : FUNCTION IDENT LPAREN paramList RPAREN unit? sep
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

// ── Code-defined tables (Epic 8 programmatic tables) ─────────────────────────
// 1D:  TABLE name(arg) [XLOG] [YLOG] <rows> END
// 2D:  TABLE name(arg : param = v1, v2, ...) <rows> END
// Body rows are whitespace-separated signed numbers; the first column is the
// lookup argument, each further column is one curve of the family.

tableDef
    : TABLE IDENT LPAREN IDENT unit? (COLON IDENT EQ numberList)? RPAREN unit? tableFlags? sep
      tableRow (sep tableRow)* sep?
      END
    ;

tableFlags
    : IDENT+
    ;

// ── Code-defined parametric run-table ────────────────────────────────────────
//   PARAMETRIC sweep1 (T_in, mdot)
//     T_in = -50:1:50 | Linear
//     mdot = [0.1, 0.2, 0.4]
//   END
// Each column assigns one declared variable to a range or an explicit list.

parametricDef
    : PARAMETRIC IDENT LPAREN paramList RPAREN sep
      paramColumn (sep paramColumn)* sep?
      END
    ;

paramColumn
    : IDENT EQ signedNumber COLON signedNumber (COLON signedNumber)? (PIPE IDENT)?   # ParamColRange
    | IDENT EQ LBRACKET numberList RBRACKET                                          # ParamColList
    ;

// ── Code-defined plot ────────────────────────────────────────────────────────
//   PLOT 'Speed vs Distance'
//     kind = xy
//     x = speed[1..N]
//     y = distance[1..N], time[1..N]
//     type = line
//     xlabel = 'Speed [m/s]'
//   END
// Declares a graph the frontend renders (xy / property / psychro). Each line is
// a `key = value(s)` attribute; values are quoted strings, numbers, or variable
// references (optionally an array slice). The leading string is the plot name
// referenced by [Graph='...'] tags in the report.
plotDef
    : PLOT STRING_LITERAL sep
      plotAttr (sep plotAttr)* sep?
      END
    ;

plotAttr
    : IDENT EQ plotValue (COMMA plotValue)*
    ;

plotValue
    : STRING_LITERAL                              # PlotValStr
    | signedNumber                                # PlotValNum
    | IDENT (LBRACKET arrayIndexList RBRACKET)?   # PlotValRef
    ;

numberList
    : signedNumber (COMMA signedNumber)*
    ;

signedNumber
    : (PLUS | MINUS)? NUMBER
    ;

tableRow
    : signedNumber+
    ;

paramList
    : (IDENT unit? (COMMA IDENT unit?)*)?
    ;

// ── Procedural body (inside FUNCTION / PROCEDURE) ─────────────────────────────

procBody
    : (procStatement (sep procStatement)* sep?)?
    ;

procStatement
    : forBlock
    | ifStatement
    | repeatStatement
    | whileStatement
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
    : forBlock
    | callStatement
    | rangeAssign
    | equation
    ;

// MATLAB-style range that fills an array variable:
//   speed = 0:10:100        (start:step:stop, step defaults to 1 if omitted)
//   freq  = 1:5:1000 | Log  (start:count:stop, geometrically spaced)
// The trailing flag (Linear | Log) selects the spacing; Linear is the default.
rangeAssign
    : IDENT EQ signedNumber COLON signedNumber (COLON signedNumber)? (PIPE IDENT)?
    ;

callStatement
    : CALL IDENT LPAREN callArgList COLON callArgList RPAREN
    ;

callArgList
    : (expr (COMMA expr)*)?
    ;

// ── Existing rules ─────────────────────────────────────────────────────────────

forBlock
    : FOR IDENT EQ expr TO expr sep statementList sep? END
    ;

whileStatement
    : WHILE boolExpr DO sep procBody END
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
    : unaryExpr ((TIMES | DIV | BACKSLASH) unaryExpr)*
    ;

unaryExpr
    : MINUS unaryExpr
    | PLUS unaryExpr
    | powExpr
    ;

powExpr
    : atom (CARET unaryExpr)? TRANSPOSE*
    ;

atom
    : NUMBER unit?                           # NumberAtom
    | IMAG_NUMBER unit?                      # ImagNumberAtom
    | STRING_LITERAL                          # StringAtom
    | IDENT LPAREN argList RPAREN            # CallAtom
    | IF LPAREN argList RPAREN               # IfCallAtom
    | IDENT LBRACKET arrayIndexList RBRACKET # ArrayAtom
    | IDENT                                  # VarAtom
    | LBRACKET matrixRow (SEMI matrixRow)* RBRACKET # MatrixLiteralAtom
    | LPAREN expr RPAREN                     # ParenAtom
    ;

matrixRow
    : expr (COMMA? expr)*
    ;

argList
    : arg (COMMA arg)*
    ;

// Named arguments (T=300) select fluid property inputs:
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
PIPE    : '|' ;
BACKSLASH : '\\' ;
TRANSPOSE : '\'' ;

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

FOR       : [fF][oO][rR] ;
TO        : [tT][oO] ;
WHILE     : [wW][hH][iI][lL][eE] ;
DO        : [dD][oO] ;
END       : [eE][nN][dD] ;
FUNCTION  : [fF][uU][nN][cC][tT][iI][oO][nN] ;
PROCEDURE : [pP][rR][oO][cC][eE][dD][uU][rR][eE] ;
MODULE    : [mM][oO][dD][uU][lL][eE] ;
TABLE     : [tT][aA][bB][lL][eE] ;
PARAMETRIC : [pP][aA][rR][aA][mM][eE][tT][rR][iI][cC] ;
PLOT      : [pP][lL][oO][tT] ;
IF        : [iI][fF] ;
THEN      : [tT][hH][eE][nN] ;
ELSE      : [eE][lL][sS][eE] ;
REPEAT    : [rR][eE][pP][eE][aA][tT] ;
UNTIL     : [uU][nN][tT][iI][lL] ;
CALL      : [cC][aA][lL][lL] ;
AND       : [aA][nN][dD] ;
OR        : [oO][rR] ;
NOT       : [nN][oO][tT] ;

// ── String literals ────────────────────────────────────────────────────────────

STRING_LITERAL
    : '\'' ( ~'\'' )* '\''
    ;

// ── Literals & identifiers ─────────────────────────────────────────────────────

IMAG_NUMBER
    : DIGIT+ ('.' DIGIT+)? EXPONENT? [iIjJ]
    | '.' DIGIT+ EXPONENT? [iIjJ]
    ;

NUMBER
    : DIGIT+ ('.' DIGIT+)? EXPONENT?
    | '.' DIGIT+ EXPONENT?
    ;

// A trailing '$' marks a string variable (EES convention): R$ = 'R134a'.
IDENT
    : [a-zA-Z] [a-zA-Z0-9_]* '$'?
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
