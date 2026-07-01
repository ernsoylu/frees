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
    | linearizeDef
    | componentDef
    | componentInst
    | connectStmt
    | statement
    ;

// ── LINEARIZE block (plant → control coupling, Phase 4) ───────────────────────
//   LINEARIZE plant (block = warmup, a = A, b = B, c = C, d = D)
//     INPUT  Q_in
//     OUTPUT T
//   END
// Numerically linearizes a transient component network (the named DYNAMIC block)
// about its operating point into state-space matrices A,B,C,D (named in the
// header, default A/B/C/D), which feed the control suite (ss/lqr/place/…). States
// are the block's der() variables; INPUT/OUTPUT name the exogenous inputs and the
// observed outputs (member accessors allowed, e.g. m.port.T).
linearizeDef
    : LINEARIZE IDENT LPAREN dynamicHeader RPAREN sep
      linearizeItem (sep linearizeItem)* sep?
      END
    ;

linearizeItem
    : INPUT linVar (COMMA linVar)*    # LinInput
    | OUTPUT linVar (COMMA linVar)*   # LinOutput
    ;

linVar
    : IDENT (DOT IDENT)*
    ;

// ── FUNCTION / PROCEDURE / MODULE definitions ─────────────────────────────────

// Single-output:  FUNCTION f(x) ... f := ... END   (callable inline in exprs)
// Multi-output:    FUNCTION [a, b] = f(x) ... a := ... b := ... END
//                  consumed array-language-style with [p, q] = f(x) (see multiAssign).
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
    | IDENT MINUS IDENT                          # PlotValHyphen
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
// by the grammar, so the analytic solver never sees der().
dynamicDef
    : DYNAMIC IDENT LPAREN dynamicHeader RPAREN sep
      (dynamicItem (sep dynamicItem)* sep?)?
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

// ── Acausal COMPONENT block (system-modeling layer) ───────────────────────────
//   COMPONENT Pump(in, out)
//     PARAM eta = 0.7, fluid$ = Water
//     v = Volume(fluid$, P=in.P, h=in.h)
//     out.mdot = in.mdot
//     out.h    = in.h + v*(out.P - in.P)/eta
//     W        = in.mdot*(out.h - in.h)
//   END
// A reusable template of acausal equations with typed ports. Ports name the
// streams the component connects to; PARAM lines declare parameters (with
// optional defaults; a trailing '$' marks a string parameter, e.g. a fluid
// name). Body equations reference port members with a dotted accessor
// (in.P, out.h, out.mdot); bare names are component-local variables or named
// outputs. Instantiation (componentInst) binds the ports to actual streams and
// the expander clones the body into flat scalar equations the solver handles.
componentDef
    : COMPONENT IDENT LPAREN paramList RPAREN sep
      componentItem (sep componentItem)* sep?
      END
    ;

componentItem
    : PARAM componentParam (COMMA componentParam)*   # CompParam
    | componentVariant                               # CompVariant
    | componentInst                                  # CompSubInst
    | connectStmt                                    # CompSubConnect
    | equation                                       # CompEq
    ;

// A selectable physics variant ("one component, many models"). The component's
// `model$` parameter chooses which variant's body is expanded; equations outside
// any VARIANT are shared by every variant. REQUIRE lists the parameters that
// variant needs (validated only when it is the selected one).
//   VARIANT map REQUIRE map_mdot, map_eta
//     out.mdot = map_mdot(out.P/in.P, rpm)
//     ...
//   END
componentVariant
    : VARIANT IDENT (REQUIRE IDENT (COMMA IDENT)*)? sep
      (equation sep)*
      END
    ;

componentParam
    : IDENT (EQ expr)?
    ;

// Instantiation:  Pump P1(s3, s4, eta=0.8, fluid$=Water)
//   leading positional args bind ports (to stream names, in declaration order);
//   trailing name=value args override parameters.
componentInst
    : IDENT IDENT LPAREN componentArgList RPAREN
    ;

// Native branching connection:  connect(HP.out, LP.in, F1.steam)
//   Ties the listed ports/streams into one node — pressure & enthalpy equal,
//   mass conserved (Σ inlet = Σ outlet). Each argument is a port reference
//   (instance.port) or a bare stream name. Lets parallel paths / splits be
//   expressed without an explicit Splitter component (the shared-name shorthand
//   still works for series chains).
connectStmt
    : CONNECT LPAREN connectPort (COMMA connectPort)* RPAREN
    ;

connectPort
    : IDENT (DOT IDENT)*
    ;

componentArgList
    : (componentArg (COMMA componentArg)*)?
    ;

componentArg
    : IDENT EQ expr   # CompArgNamed
    | expr            # CompArgPos
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
    | symbolicDecl
    | multiAssign
    | rangeAssign
    | equation
    ;

// SYMBOLIC s, t — declare independent symbolic variables (e.g. the Laplace s).
symbolicDecl
    : SYMBOLIC IDENT (COMMA IDENT)*
    ;

// array-language-style destructuring call of a multi-output FUNCTION or CALL intrinsic:
//   [q, w]        = split(x)
//   [A, B, C, D]  = tf2ss(num, den)
//   [~, ~, V]     = svd(A)        (use '~' to discard an output position)
//   [A, B]        = tf2ss(num, den)   (omit trailing outputs you don't need)
// Sugar for CALL split(x : q, w); listed before `equation` so it wins over a
// matrix-literal equation with the same shape.
multiAssign
    : LBRACKET callOutputs RBRACKET EQ IDENT LPAREN callArgList RPAREN
    ;

// Destructuring targets: a named variable, or '~' to ignore that output slot.
callOutputs
    : callOutput (COMMA callOutput)*
    ;

callOutput
    : IDENT
    | TILDE
    ;

// array-language-style range that fills an array variable:
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
    | IDENT (DOT IDENT)+                      # MemberAtom
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

// Array index range uses array-language-style colons: A[1:3], speed[1:N].
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
TILDE   : '~' ;

// array-language-style element-wise operators. Two chars starting with '.', so they
// don't clash with '..' (DOTDOT) or decimal literals ('.5' is a NUMBER, since
// these require an operator char — not a digit — after the dot).
DOTSTAR      : '.*' ;
DOTSLASH     : './' ;
DOTBACKSLASH : '.\\' ;
DOTCARET     : '.^' ;

// Member accessor for component ports/outputs (in.P, HP.out.h, T1.W). A lone
// '.'; longest-match keeps '..' (DOTDOT), '.5' (NUMBER) and '.*' etc. distinct.
DOT          : '.' ;

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
LINEARIZE : [lL][iI][nN][eE][aA][rR][iI][zZ][eE] ;
INPUT     : [iI][nN][pP][uU][tT] ;
OUTPUT    : [oO][uU][tT][pP][uU][tT] ;
EVENT     : [eE][vV][eE][nN][tT] ;
COMPONENT : [cC][oO][mM][pP][oO][nN][eE][nN][tT] ;
CONNECT   : [cC][oO][nN][nN][eE][cC][tT] ;
PARAM     : [pP][aA][rR][aA][mM] ;
VARIANT   : [vV][aA][rR][iI][aA][nN][tT] ;
REQUIRE   : [rR][eE][qQ][uU][iI][rR][eE] ;
IF        : [iI][fF] ;
THEN      : [tT][hH][eE][nN] ;
ELSE      : [eE][lL][sS][eE] ;
REPEAT    : [rR][eE][pP][eE][aA][tT] ;
UNTIL     : [uU][nN][tT][iI][lL] ;
CALL      : [cC][aA][lL][lL] ;
SYMBOLIC  : [sS][yY][mM][bB][oO][lL][iI][cC] ;
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

// A trailing '$' marks a string variable (by long-standing convention): R$ = 'R134a'.
// A trailing '#' marks a built-in constant (by long-standing convention): R#, g#, sigma#.
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
