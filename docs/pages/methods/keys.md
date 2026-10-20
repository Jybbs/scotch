# Position Keys

Every position is named in the index by a 64-bit key, the Zobrist hash python-chess computes for it through `chess.polyglot.zobrist_hash`, which combines one fixed random number for each piece standing on each square with one each for the side to move, each castling right, and the file a pawn could capture en passant on.[^zobrist1970][^fiekas2025] Two positions share a key where they agree on all of these, which is when FIDE's Laws of Chess count them as the same position in every case but the en passant one below, since the Laws require the same player to have the move, the same pieces to stand on the same squares, and every piece to have the same moves.[^fide2023]

## The En Passant File

The hash reads the en passant file wherever a pawn of the side to move stands beside the pawn that has just advanced two squares, whether or not the capture is legal, whereas the Laws count the capture only where it could be played. Two positions differing only in an en passant capture that would leave the capturing side's king in check, through a pin or through a check the capture does not answer, therefore take two keys though the Laws count them as one, which splits a run at that ply and never joins two positions the Laws keep apart.

## Keys Shared by Accident

Two different positions share a key by accident with a chance of one in 2 to the power of 64. The index holds <!-- positions -->37,039,333<!-- /positions --> positions of its games, <!-- keys -->28,035,106<!-- /keys --> of them distinct, as `mise run docs:render` counts them, so the chance that any two distinct positions it holds share a key comes to about one in <!-- accidents -->47,000<!-- /accidents -->. A match through such a pair would still need the positions after it to agree before its run grew past one ply.

[^zobrist1970]: Zobrist, Albert L. 1970. "A New Hashing Method with Application for Game Playing," Technical Report 88, Computer Sciences Department, University of Wisconsin. <https://minds.wisc.edu/handle/1793/57624>

[^fiekas2025]: Fiekas, Niklas. 2025. "python-chess 1.11.2 Documentation," Polyglot Opening Book Reading, zobrist_hash. <https://python-chess.readthedocs.io/en/v1.11.2/polyglot.html>

[^fide2023]: International Chess Federation. 2023. "FIDE Laws of Chess," Article 9.2.3. <https://handbook.fide.com/chapter/E012023>
