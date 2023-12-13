# Standard: Portable Game Notation Specification and Implementation Guide (Supplement)

Revised: 8 September 2001

Status: Final draft

Authors:  Alan Cowderoy (Palamede), Ben Bulsink (DGT Projects), Andrew Templeton (Palamede/Palview), Eric Bentzen (Enpassant.dk, Palamede), Mathias Feist (Chessbase), Victor Zakharov (Chess Assistant).

Contact: alan@cowderoy.com

- [Standard: Portable Game Notation Specification and Implementation Guide (Supplement)](#standard-portable-game-notation-specification-and-implementation-guide-supplement)
    * [1. Introduction](#1-introduction)
    * [2. Design aims](#2-design-aims)
        + [2.1 The enhancements must not break the existing standard.](#21-the-enhancements-must-not-break-the-existing-standard)
        + [2.2  The enhancements should maintain the ease of use and legibility so characteristic of PGN.](#22--the-enhancements-should-maintain-the-ease-of-use-and-legibility-so-characteristic-of-pgn)
        + [2.3 If new command structures are to be introduced they should be specified in such a way that they are usable for other extensions if needed.](#23-if-new-command-structures-are-to-be-introduced-they-should-be-specified-in-such-a-way-that-they-are-usable-for-other-extensions-if-needed)
    * [3. Proposals](#3-proposals)
        + [3.1 Introduction](#31-introduction)
        + [3.2 A generalised format for embedding commands in comments.](#32-a-generalised-format-for-embedding-commands-in-comments)
            - [3.2.1 Position](#321-position)
            - [3.2.2 Structure](#322-structure)
            - [3.2.3 Opening delimiter](#323-opening-delimiter)
            - [3.2.3 Commands](#323-commands)
            - [3.2.4 Parameters](#324-parameters)
            - [3.2.5 Terminator](#325-terminator)
            - [3.2.6 Multiple commands.](#326-multiple-commands)
    * [4. Time handling commands.](#4-time-handling-commands)
        + [4.1 Introduction.](#41-introduction)
        + [4.2 The clk command.](#42-the-clk-command)
        + [4.3 Elapsed Game Time: the egt command](#43-elapsed-game-time-the-egt-command)
        + [4.4 Elapsed Move Time: the emt command](#44-elapsed-move-time-the-emt-command)
        + [4.5 Mechanical Clock Time: the mct command](#45-mechanical-clock-time-the-mct-command)
    * [5. The "Running Clock"](#5-the-running-clock)
        + [5.1 The Clock tag](#51-the-clock-tag)
    * [6. Clock Start Time.](#6-clock-start-time)
        + [6.1 Introduction.](#61-introduction)
    * [7.](#7)
    * [8. Example game.](#8-example-game)
    * [9. Authors websites](#9-authors-websites)
    * [10. Thanks](#10-thanks)

<small><i><a href='http://ecotrust-canada.github.io/markdown-toc/'>Table of contents generated with markdown-toc</a></i></small>

## 1. Introduction

PGNs combination of a formal specification for computer use with easy readability and manipulation by humans has firmly established it as the data format of choice for representing chess games. This is a major success, and a tribute to the quality of the work done by the original authors.

Steven Edwards, the author, appears unfortunately to be no longer involved with PGN and there is now no defined means of arbitrating and implementing proposed changes. There is also a huge body of software which implements the current standard and would break in various ways if it were changed.

At the same time the increased use of DGT boards in major tournaments for the retransmission of live games  has rendered one of the features that was planned for PGN but never implemented increasingly important, namely the possibility of encoding time information relating to each move.

Without the possibility of encoding time information in PGN its usefulness in the retransmission of live games is significantly weakened forcing developers either to resort to proprietary formats or to break the standard.

Computer chess program authors are also now finding that they have no accepted way to encode such simple and recognised concepts as numeric position evaluations or search depth.

Given this situation some have understandably set about defining wholly new XML based definitions for encoding chess games. While this work is interesting, as of today there is no widely accepted and supported XML schema.

It thus seems important to us to attempt an incremental improvement to PGN intended to eliminate the functional weaknesses described above.

This document proposes an extension to PGN designed to offer an immediate 'work around' solution to the problems outlined above.

## 2. Design aims

### 2.1 The enhancements must not break the existing standard.

This rules out new syntactical elements. Steve Edwards himself proposed a format (BIF) that would have resolved these problems, but it was never implemented and doing so now would break large quantities of software.

### 2.2  The enhancements should maintain the ease of use and legibility so characteristic of PGN.

This rules out very precise but possibly more computer readable formats in favour of clearer human-readable ones.

### 2.3 If new command structures are to be introduced they should be specified in such a way that they are usable for other extensions if needed.

The intention here is to provide a generalised syntax that will enable other extensions rather than only solving one particular problem (time handling in our case).

## 3. Proposals

### 3.1 Introduction

The only way to extend the syntax without breaking the standard is to embed the new command syntax into PGN comments. This is a kludge and such an obvious one that it was already suggested when Steve Edwards proposed the BIF format in 1996. It is still the only option available.

Apart from a general command syntax we propose several specific commands designed for the handling of time information.

We also propose the addition of a tag to the header to handle the state of the "running clock" where the game is being transmitted live and two other optional tags designed to handle special cases where the clock start times are needed.

These additions are not problematic as the standard concedes the possibility of adding new tags to the header (outside the mandatory seven tag roster)

Interpreting time information for a game is either difficult or impossible if the time controls in force are not known. PGN has a TimeControl tag for this, and it should be regarded as mandatory when time information is to be embedded into the pgn.

### 3.2 A generalised format for embedding commands in comments.

#### 3.2.1 Position

An embedded  command may occur at any position in a standard PGN comment, ie between { } .
For example:

    {Optional leading comments [%clk 1:05:23] optional trailing comments} 

where `[%clk 1:05:23]`  is the embedded command string.

#### 3.2.2 Structure

The command string is structured as follows.

* A leading tag of `[%`
* A command name consisting of one or more alphanumeric characters.
* A space character.
* Either a single parameter or a comma delimited list of parameter values.
* A closing tag of `]`

For example:

    [%clk 1:05:23] 

#### 3.2.3 Opening delimiter

The characters `[%` are redefined to indicate the start of a command sequence when found in between pgn comment tags.

As all ASCII characters are legal in a comment string it is not possible to rely on any single character as an unambiguous opening delimiter. We have chosen to use `[%`. While this also could technically occur in some other context, it seems highly unlikely.

#### 3.2.3 Commands

Command names start immediately after the `[%`.  They consist of one or more alphanumeric characters They are terminated by the first space character encountered.

We are *not* proposing any fixed canonical list of commands. The idea is to describe a generalised command syntax, not to impose a particular set of commands.

We *are* proposing a set of commands to deal with time handling. `"clk"` in the example above is the proposed command name for recording move times. See section 4 for the detailed specification of this and other time related commands.

In general software encountering an embedded command it does not understand should take no special action and pass the string through unchanged as part of the comment.

For display purposes only presentation software, such as pgn readers, should by default strip out all commands before display in order to improve legibility.

#### 3.2.4 Parameters

This parameter syntax is based on the epd opcode syntax described at [16.2.4 of the pgn spec](pgn-specification.md#1624-operations).

A command is followed by a single space and then either by a single operand or by a comma separated list of operands.

An operand is either:

* a set containing any ascii characters except the comma and right hand square bracket or
* a double-quoted string containing a set of any ascii characters except the double quote.

For instance:

    [%command 1:45:12,Nf6,"very interesting, but wrong"]

This command has four operands, a time value, a san move value, and a double quote delimited string. Note that the quote delimited string may contain commas.

Commas are illegal in non quote delimited strings because the comma serves as the operand list separator.

Right hand square brackets are illegal in non quote delimited strings because they terminate both the last operand and the command.

We have thus departed from the epd opcode specification in two ways:

* The operand list is separated using a comma rather than a space.
* Space characters are allowed in non quote delimited operands

So it is possible to pass a full FEN string as an unquoted operand as in the example below.

    [%command "very tense start to the 
    game",4r1k1/pp1b2r1/2n1pq1p/3p2pP/2pP2B1/P1P1Q3/2P2PPB/R4RK1 w - - 0 1,e4,d4]

This command has four operands, the first is a double quote delimited string, the second is a FEN, the third is e4, and the fourth is d4.

#### 3.2.5 Terminator

The command is terminated by a single `]` character.

#### 3.2.6 Multiple commands.

A single comment tag may contain multiple embedded commands.
For instance:

    {[%clk 0:00:07][%eval -6.05] White is toast}

## 4. Time handling commands.

### 4.1 Introduction.

We propose the following commands for time handling  The first is  the command that DGT boards will be using to transmit times via pgn.

The other commands are optional and cover times that can be derived from the clock time. They are technically redundant but may be useful for highlighting aspects of the game, and the players use of time.

All these commands take one and only one parameter which is a time value in the format h:mm:ss (except for the mct command which requires hh:mm:ss)

The comments containing the embedded commands are to be taken as referring to the move immediately preceding them.

### 4.2 The clk command.

    {[%clk 1:55:21]}

This is the time displayed on the players clock. It represents the time remaining to the next time control. It is proposed that future versions of software producing pgn from games played on DGT boards include this command after every move.

The clk command is intended for the *automatic* recording of time values by digital clock/board combinations. It is not normally intended for use with mechanical clocks which show a clock time rather than the time remaining to the next control.

### 4.3 Elapsed Game Time: the egt command

    {[%egt 1:25:42]}

The elapsed time that a player has used for all moves in the game up to that point.  Takes one parameter in the format h:mm:ss

### 4.4 Elapsed Move Time: the emt command

    {[%emt 0:05:42]}

The elapsed time that a player used for the commented move.  Takes one parameter in the format h:mm:ss

### 4.5 Mechanical Clock Time: the mct command

    {[%mct 17:10:42]}

The time actually displayed on a mechanical clock. Notice that here the time format is hh:mm:ss.

## 5. The "Running Clock"

The syntax described above allows us to encode a move time for a *completed move*. This is all well and good but during transmission of a live game it can also be interesting to know the state of the clock of the player whose turn it is to move *but who has not yet done so*.

### 5.1 The Clock tag

We propose that this information should be encoded in a new header tag.

    [Clock "B/0:45:56"]

As only one clock is running at a time, only one tag is necessary.

In the example above Blacks clock is running and is currently showing the time indicated by the string following the /.

Clock is the name of the tag.  It is followed by a string constructed as follows:

* The first character is either "W" (whites clock is running), "B"  (blacks clock is running) or "N" (the clocks are stopped).  This information is technically redundant as it could be calculated by looking at which side last moved. Encoding it here avoids this calculation and also covers the situation where a player forgets to switch the clocks. It also allows us to cover the admittedly rare case where the clocks are stopped.
* The second character is a "/" separator.  The rest of the string is a time in the format h:mm:ss which indicates the currently displayed clock time of the running clock. As for the clk command, this represents the remaining time to the next time control.

## 6. Clock Start Time.

### 6.1 Introduction.

Two optional tags are proposed to record the clock setting at the start of the play.  While it may be helpful to record normal clock start values here (as is done in the example below) they are mainly intended to cover the case where a game is adjourned, and the displayed clock times at start of play are thus non-standard.

eg.

    [WhiteClock "1:07:00"]
    [BlackClock "0:56:00"]

## 7.

As explained above the existing pgn tag [TimeControl]  (cf 9.6 and following of the standard) should be regarded as mandatory when move times are supplied.  Clearly when manipulating time information about a game details of the time controls in use are vital.

## 8. Example game.

    [Event "?"]
    [Site "Madrid"]
    [Date "1995.??.??"]
    [White "Beliavsky, A "]
    [Black "Timman, J "]
    [Result "1-0"]
    [ECO "E35"]
    [Round "2"]
    [TimeControl "40/7200:3600"]
    [WhiteClock "2:00:00"]
    [BlackClock "2:00:00"]
    [Clock "W/1:34:56"]
    
    1. d4 {[%clk 1:59:01]} Nf6 {[%clk 1:59:32] Timman hesitates slightly} 2. c4 
    {[%clk 1:58:00]} e6 {[%clk 1:57:01]} 3. Nc3 {[%clk 1:37:00] Beliavsky clearly 
    suprised here takes a full [%emt 0:20:00] on this move} Bb4 {[%clk 1:54:25]} 

Game notes:

1. The time control is specified as 40 moves in two hours and then one hour to finish. This tag must be specified in order to permit calculation of such information as elapsed time since start of game. It is also particularly important that it be specified when fischer or bronstein time controls are used.
2. In the example we have given the White and BlackClock tags but in this case this was redundant as the clocks were set as normal to show that two hours remained to the first time control. If the White and BlackClock tags are absent start times should be derived from the TimeControl tag and/or the Time tag, where they are specified they take precedence.
3. The Clock tag, which is only relevant during live transmission of a game, here shows that it is whites turn to move and that he/she has 1 hour 34 minutes and 56 seconds remaining on their clock.
4. PGN generated directly from DGT boards will have a clk command like the one following the first move after *all* subsequent moves.
5. In this example we imagine that the pgn has been further edited to include additional text comments and commands (cf the %emt command after whites third move.)
6. Notice that commands can appear at any point inside comments and that there may be multiple commands in a single comment.
7. The Beliavsky/Timman game is real, all the rest is pure invention.

## 9. Authors websites

* DGT Projects: http://www.dgtprojects.com/
* Chess Base: http://www.chessbase.com/
* Chess Assistant: http://www.chessassistant.com/
* Palview: http://www.enpassant.dk/chess/palview/

## 10. Thanks

Many thanks to Axel Fritz and Robert Ericsson
