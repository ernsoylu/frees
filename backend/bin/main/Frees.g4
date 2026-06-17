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
    | stateTableDef
    | plotDef
    | dynamicDef
    | statement
    ;

// ── FUNCTION / PROCEDURE / MODULE definitions ─────────────────────────────────

// Single-output:  FUNCTION f(x) ... f := ... END   (callable inline in exprs)
// Multi-output:    FUNCTION [a, b] = f(x) ... a := ... b := ... END
//                  consumed MATLAB-style with [p, q] = f(x) (see multiAssign).
functionDef
    : FUNCTION (LBRACKET funcOutputs RBRACKET EQ)? IDENT LPAREN paramList RPAREN unit? sep
      procBody
      END
    ;

funcOutputs
    : IDENT (COMMA IDENT)*
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

// ── Fluid state table ────────────────────────────────────────────────────────
//   STATE TABLE WaterCircuit(Pw1, Pw_2, Tw1)
//     FLUID = Water
//   END
// Declares the state-point variables that belong to one circuit/fluid. The
// block is fluid-aware: every CoolProp-derived property of these states uses
// the declared FLUID. Body lines are `key = value` attributes (currently just
// FLUID); the variables themselves are captured automatically from the solve.
stateTableDef
    : STATETABLE IDENT LPAREN paramList RPAREN sep
      (stateTableAttr (sep stateTableAttr)* sep?)?
      END
    ;

stateTableAttr
    : IDENT EQ stateAttrValue
    ;

stateAttrValue
    : IDENT
    | STRING_LITERAL
    ;

// ── Code-defined plot ────────────────────────────────────────────────────────
//   PLOT 'Speed vs Distance'
//     kind = xy
//     x = speed[1:N]
//     y = distance[1:N], time[1:N]
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

// ── Transient / ODE system block ─────────────────────────────────────────────
//   DYNAMIC cooling (method = ode45, t = 0 .. 600 [s], points = 200, rtol = 1e-6)
//     der(T) = -k * (T - T_inf)        { first-order ODE; T is a state }
//     T(0)   = 95 [C]                  { initial condition }
//     Q_dot  = m * cp * der(T)         { algebraic auxiliary -> output column }
//     EVENT cool: T = T_inf | falling -> stop
//   END
// A variable is a STATE iff a der(X) appears for it; each state needs exactly
// one der(X)=... and one initial condition X(t0)=.... Array states der(T[i])
// reuse the FOR / array machinery for method-of-lines PDEs. The header carries
// solver config. The whole block is routed out of the analytic equation stream
// by MarkdownEquationExtractor, so the analytic solver never sees der().
dynamicDef
    : DYNAMIC IDENT LPAREN dynamicHeader RPAREN sep
      dynamicItem (sep dynamicItem)* sep?
      END
    ;

dynamicHeader
    : (dynamicOpt (COMMA dynamicOpt)*)?
    ;

dynamicOpt
    : IDENT EQ dynamicOptVal
    ;

dynamicOptVal
    : signedNumber DOTDOT signedNumber unit?   # DynOptRange
    | signedNumber unit?                        # DynOptNum
    | IDENT                                      # DynOptIdent
    ;

dynamicItem
    : dynamicEvent                                                       # DynItemEvent
    | IDENT (LBRACKET arrayIndexList RBRACKET)? LPAREN signedNumber RPAREN EQ expr  # DynItemInit
    | forBlock                                                           # DynItemFor
    | equation                                                          # DynItemEq
    ;

// EVENT name: g_lhs = g_rhs [| rising|falling] -> stop|record
//   zero-crossing of (g_lhs - g_rhs); direction defaults to "any".
dynamicEvent
    : EVENT IDENT COLON equation (PIPE IDENT)? ARROW IDENT
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
    | multiAssign
    | rangeAssign
    | equation
    ;

// MATLAB-style destructuring call of a multi-output FUNCTION:
//   [q, w] = split(x)
// Sugar for CALL split(x : q, w); listed before `equation` so it wins over a
// matrix-literal equation with the same shape.
multiAssign
    : LBRACKET funcOutputs RBRACKET EQ IDENT LPAREN callArgList RPAREN
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
    : unaryExpr ((TIMES | DIV | BACKSLASH | DOTSTAR | DOTSLASH | DOTBACKSLASH) unaryExpr)*
    ;

unaryExpr
    : MINUS unaryExpr
    | PLUS unaryExpr
    | powExpr
    ;

powExpr
    : atom ((CARET | DOTCARET) unaryExpr)? TRANSPOSE*
    ;

atom
    : NUMBER unit?                           # NumberAtom
    | IMAG_NUMBER unit?                      # ImagNumberAtom
    | STRING_LITERAL                          # StringAtom
    | IDENT LPAREN argList RPAREN            # CallAtom
    | IF LPAREN argList RPAREN               # IfCallAtom
    | IDENT LBRACKET arrayIndexList RBRACKET # ArrayAtom
    | IDENT                                  # VarAtom
    | LBRACKET matrixRow (SEMI matrixRow)* RBRACKET unit? # MatrixLiteralAtom
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

// Array index range uses MATLAB-style colons: A[1:3], speed[1:N].
// (The DOTDOT token is retained only for DYNAMIC time spans: t = 0 .. 600.)
arrayIndex
    : expr (COLON expr)?
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

// MATLAB-style element-wise operators. Two chars starting with '.', so they
// don't clash with '..' (DOTDOT) or decimal literals ('.5' is a NUMBER, since
// these require an operator char — not a digit — after the dot).
DOTSTAR      : '.*' ;
DOTSLASH     : './' ;
DOTBACKSLASH : '.\\' ;
DOTCARET     : '.^' ;

// ASSIGN must be defined before COLON so ':=' beats ':'
ASSIGN  : ':=' ;
COLON   : ':' ;
ARROW   : '->' ;

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
// "STATE TABLE" as one token (space/tab separated) so neither STATE nor TABLE
// alone becomes a reserved word — a lone variable named `state` still lexes as
// IDENT. Defined before TABLE; longest-match makes it win for "STATE TABLE".
STATETABLE : [sS][tT][aA][tT][eE] [ \t]+ [tT][aA][bB][lL][eE] ;
TABLE     : [tT][aA][bB][lL][eE] ;
PARAMETRIC : [pP][aA][rR][aA][mM][eE][tT][rR][iI][cC] ;
PLOT      : [pP][lL][oO][tT] ;
DYNAMIC   : [dD][yY][nN][aA][mM][iI][cC] ;
EVENT     : [eE][vV][eE][nN][tT] ;
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
// A trailing '#' marks a built-in constant (EES convention): R#, g#, sigma#.
IDENT
    : [a-zA-Z] [a-zA-Z0-9_]* ('$' | '#')?
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
