# Position Keys

Every position is named in the index by a 64-bit key, its Zobrist hash under Polyglot's random numbers, which combines one fixed random number for each piece standing on each square with one each for the side to move, each castling right, and the file a pawn could capture en passant on.[^zobrist1970] Two positions share a key where they agree on all of these, which is when FIDE's Laws of Chess count them as the same position, since the Laws require the same player to have the move, the same pieces to stand on the same squares, and every piece to have the same moves.[^fide2023] The crate under `rust/` computes each key through shakmaty as it reads each game, from the standard starting position or from the position a `FEN` tag sets up, under the rule below for the en passant file.[^fiekas2026]

## The En Passant File

The hash reads the en passant file only where a legal move plays the capture, because the Laws count the capture only where it could be played. Two positions differing only in an en passant capture that would leave the capturing side's king in check, through a pin or through a check the capture does not answer, therefore take one key, as the Laws count them as one. Everywhere else, each key is the one python-chess's `chess.polyglot.zobrist_hash` gives the same position, which reads the file wherever a pawn of the side to move stands beside the pawn that has just advanced two squares.[^fiekas2025]

## Keys Shared by Accident

Two different positions share a key by accident with a chance of one in 2 to the power of 64. The index holds <!-- positions -->98,542,793<!-- /positions --> positions of its games, <!-- keys -->72,721,379<!-- /keys --> of them distinct, as `mise run docs:render` counts them, so the chance that any two distinct positions it holds share a key comes to about one in <!-- accidents -->7,000<!-- /accidents -->. A match through such a pair would still need the positions after it to agree before its run grew past one ply.

[^zobrist1970]: Zobrist, Albert L. 1970. "A New Hashing Method with Application for Game Playing," Technical Report 88, Computer Sciences Department, University of Wisconsin. <https://minds.wisc.edu/handle/1793/57624>

[^fide2023]: International Chess Federation. 2023. "FIDE Laws of Chess," Article 9.2.3. <https://handbook.fide.com/chapter/E012023>

[^fiekas2026]: Fiekas, Niklas. 2026. "shakmaty 0.30.2 Documentation," Module zobrist, and EnPassantMode. <https://docs.rs/shakmaty/0.30.2/shakmaty/zobrist/index.html>

[^fiekas2025]: Fiekas, Niklas. 2025. "python-chess 1.11.2 Documentation," Source of Module chess.polyglot, ZobristHasher.hash_ep_square. <https://python-chess.readthedocs.io/en/v1.11.2/_modules/chess/polyglot.html>
