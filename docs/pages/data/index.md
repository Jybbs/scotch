# Data

*Scotch* matches a game against the <!-- games -->435,321<!-- /games --> games the store holds, read from the <!-- files -->250<!-- /files --> archives [PGN Mentor](https://www.pgnmentor.com/files.html) publishes in its players section, one archive for each player, holding every game PGN Mentor collects for that player. A game two archives both hold, such as one between two players who each have a file, is kept once, under the archive `sources.toml` declares first, two copies counting as one game where their Seven Tag Roster and their moves agree.[^edwards1994]

## The Decades Played

The stored games run from the <!-- earliest -->1740s<!-- /earliest --> to the present, and <!-- recent -->85%<!-- /recent --> of them were played since <!-- recent-from -->1980<!-- /recent-from -->. A game whose `Date` tag carries no year counts as undated and stays out of the decades, which leaves <!-- undated -->279<!-- /undated --> games out. The strip below shades each decade by how many games it holds, the earliest decades sharing its first cell, and the table beneath it counts every decade, each read from the index by `mise run docs:render`.

<!-- decades -->
| **Decade** | **Games** | **Played by Its End** |
|---|---:|---:|
| 1740s | 1 | 0.0% |
| 1780s | 2 | 0.0% |
| 1790s | 3 | 0.0% |
| 1820s | 1 | 0.0% |
| 1830s | 121 | 0.0% |
| 1840s | 248 | 0.1% |
| 1850s | 556 | 0.2% |
| 1860s | 614 | 0.4% |
| 1870s | 577 | 0.5% |
| 1880s | 1,095 | 0.7% |
| 1890s | 1,659 | 1.1% |
| 1900s | 2,965 | 1.8% |
| 1910s | 1,890 | 2.2% |
| 1920s | 4,109 | 3.2% |
| 1930s | 4,304 | 4.2% |
| 1940s | 4,288 | 5.2% |
| 1950s | 9,938 | 7.4% |
| 1960s | 14,779 | 10.8% |
| 1970s | 18,661 | 15.1% |
| 1980s | 31,510 | 22.4% |
| 1990s | 62,060 | 36.6% |
| 2000s | 70,706 | 52.9% |
| 2010s | 89,953 | 73.6% |
| 2020s | 115,002 | 100.0% |
<!-- /decades -->

## The Files

The list below ranks the archives under each initial by the games the store holds from them, each row set over a curve of the games the store holds from that archive in each decade. The table beneath names each file the store draws from, the provider publishing it, and the section of the provider's site listing it, written from `src/scotch/sources/sources.toml` by `mise run docs:render`.

<!-- sources -->
| **Provider** | **Section** | **File** |
|---|---|---|
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Abdusattorov.zip`](https://www.pgnmentor.com/players/Abdusattorov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Adams.zip`](https://www.pgnmentor.com/players/Adams.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Akobian.zip`](https://www.pgnmentor.com/players/Akobian.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Akopian.zip`](https://www.pgnmentor.com/players/Akopian.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Alburt.zip`](https://www.pgnmentor.com/players/Alburt.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Alekhine.zip`](https://www.pgnmentor.com/players/Alekhine.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Alekseev.zip`](https://www.pgnmentor.com/players/Alekseev.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Almasi.zip`](https://www.pgnmentor.com/players/Almasi.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Anand.zip`](https://www.pgnmentor.com/players/Anand.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Anderssen.zip`](https://www.pgnmentor.com/players/Anderssen.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Andersson.zip`](https://www.pgnmentor.com/players/Andersson.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Andreikin.zip`](https://www.pgnmentor.com/players/Andreikin.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Aronian.zip`](https://www.pgnmentor.com/players/Aronian.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Ashley.zip`](https://www.pgnmentor.com/players/Ashley.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Averbakh.zip`](https://www.pgnmentor.com/players/Averbakh.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Azmaiparashvili.zip`](https://www.pgnmentor.com/players/Azmaiparashvili.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Bacrot.zip`](https://www.pgnmentor.com/players/Bacrot.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Bareev.zip`](https://www.pgnmentor.com/players/Bareev.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`BecerraRivero.zip`](https://www.pgnmentor.com/players/BecerraRivero.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Beliavsky.zip`](https://www.pgnmentor.com/players/Beliavsky.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Benjamin.zip`](https://www.pgnmentor.com/players/Benjamin.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Benko.zip`](https://www.pgnmentor.com/players/Benko.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Berliner.zip`](https://www.pgnmentor.com/players/Berliner.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Bernstein.zip`](https://www.pgnmentor.com/players/Bernstein.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Bird.zip`](https://www.pgnmentor.com/players/Bird.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Bisguier.zip`](https://www.pgnmentor.com/players/Bisguier.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Blackburne.zip`](https://www.pgnmentor.com/players/Blackburne.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Blatny.zip`](https://www.pgnmentor.com/players/Blatny.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Bogoljubow.zip`](https://www.pgnmentor.com/players/Bogoljubow.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Boleslavsky.zip`](https://www.pgnmentor.com/players/Boleslavsky.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Bologan.zip`](https://www.pgnmentor.com/players/Bologan.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Botvinnik.zip`](https://www.pgnmentor.com/players/Botvinnik.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Breyer.zip`](https://www.pgnmentor.com/players/Breyer.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Bronstein.zip`](https://www.pgnmentor.com/players/Bronstein.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Browne.zip`](https://www.pgnmentor.com/players/Browne.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Bruzon.zip`](https://www.pgnmentor.com/players/Bruzon.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Bu.zip`](https://www.pgnmentor.com/players/Bu.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Byrne.zip`](https://www.pgnmentor.com/players/Byrne.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Capablanca.zip`](https://www.pgnmentor.com/players/Capablanca.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Carlsen.zip`](https://www.pgnmentor.com/players/Carlsen.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Caruana.zip`](https://www.pgnmentor.com/players/Caruana.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Chiburdanidze.zip`](https://www.pgnmentor.com/players/Chiburdanidze.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Chigorin.zip`](https://www.pgnmentor.com/players/Chigorin.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Christiansen.zip`](https://www.pgnmentor.com/players/Christiansen.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`DeFirmian.zip`](https://www.pgnmentor.com/players/DeFirmian.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`DeLaBourdonnais.zip`](https://www.pgnmentor.com/players/DeLaBourdonnais.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Denker.zip`](https://www.pgnmentor.com/players/Denker.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Ding.zip`](https://www.pgnmentor.com/players/Ding.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`DominguezPerez.zip`](https://www.pgnmentor.com/players/DominguezPerez.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Dreev.zip`](https://www.pgnmentor.com/players/Dreev.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Duda.zip`](https://www.pgnmentor.com/players/Duda.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Dzindzichashvili.zip`](https://www.pgnmentor.com/players/Dzindzichashvili.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Ehlvest.zip`](https://www.pgnmentor.com/players/Ehlvest.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Eljanov.zip`](https://www.pgnmentor.com/players/Eljanov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Erigaisi.zip`](https://www.pgnmentor.com/players/Erigaisi.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Euwe.zip`](https://www.pgnmentor.com/players/Euwe.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Evans.zip`](https://www.pgnmentor.com/players/Evans.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Fedorowicz.zip`](https://www.pgnmentor.com/players/Fedorowicz.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Fine.zip`](https://www.pgnmentor.com/players/Fine.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Finegold.zip`](https://www.pgnmentor.com/players/Finegold.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Firouzja.zip`](https://www.pgnmentor.com/players/Firouzja.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Fischer.zip`](https://www.pgnmentor.com/players/Fischer.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Fishbein.zip`](https://www.pgnmentor.com/players/Fishbein.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Flohr.zip`](https://www.pgnmentor.com/players/Flohr.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Gaprindashvili.zip`](https://www.pgnmentor.com/players/Gaprindashvili.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Gashimov.zip`](https://www.pgnmentor.com/players/Gashimov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Gelfand.zip`](https://www.pgnmentor.com/players/Gelfand.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Geller.zip`](https://www.pgnmentor.com/players/Geller.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Georgiev.zip`](https://www.pgnmentor.com/players/Georgiev.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Giri.zip`](https://www.pgnmentor.com/players/Giri.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Gligoric.zip`](https://www.pgnmentor.com/players/Gligoric.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Goldin.zip`](https://www.pgnmentor.com/players/Goldin.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`GrandaZuniga.zip`](https://www.pgnmentor.com/players/GrandaZuniga.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Grischuk.zip`](https://www.pgnmentor.com/players/Grischuk.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Gukesh.zip`](https://www.pgnmentor.com/players/Gukesh.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Gulko.zip`](https://www.pgnmentor.com/players/Gulko.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Gunsberg.zip`](https://www.pgnmentor.com/players/Gunsberg.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`GurevichD.zip`](https://www.pgnmentor.com/players/GurevichD.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`GurevichM.zip`](https://www.pgnmentor.com/players/GurevichM.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Harikrishna.zip`](https://www.pgnmentor.com/players/Harikrishna.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Hort.zip`](https://www.pgnmentor.com/players/Hort.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Horwitz.zip`](https://www.pgnmentor.com/players/Horwitz.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Hou.zip`](https://www.pgnmentor.com/players/Hou.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Huebner.zip`](https://www.pgnmentor.com/players/Huebner.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Ibragimov.zip`](https://www.pgnmentor.com/players/Ibragimov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`IllescasCordoba.zip`](https://www.pgnmentor.com/players/IllescasCordoba.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Inarkiev.zip`](https://www.pgnmentor.com/players/Inarkiev.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Ivanchuk.zip`](https://www.pgnmentor.com/players/Ivanchuk.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`IvanovA.zip`](https://www.pgnmentor.com/players/IvanovA.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`IvanovI.zip`](https://www.pgnmentor.com/players/IvanovI.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Ivkov.zip`](https://www.pgnmentor.com/players/Ivkov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Jakovenko.zip`](https://www.pgnmentor.com/players/Jakovenko.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Janowski.zip`](https://www.pgnmentor.com/players/Janowski.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Jobava.zip`](https://www.pgnmentor.com/players/Jobava.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Jussupow.zip`](https://www.pgnmentor.com/players/Jussupow.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Kaidanov.zip`](https://www.pgnmentor.com/players/Kaidanov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Kamsky.zip`](https://www.pgnmentor.com/players/Kamsky.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Karjakin.zip`](https://www.pgnmentor.com/players/Karjakin.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Karpov.zip`](https://www.pgnmentor.com/players/Karpov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Kasimdzhanov.zip`](https://www.pgnmentor.com/players/Kasimdzhanov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Kasparov.zip`](https://www.pgnmentor.com/players/Kasparov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Kavalek.zip`](https://www.pgnmentor.com/players/Kavalek.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Keres.zip`](https://www.pgnmentor.com/players/Keres.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Keymer.zip`](https://www.pgnmentor.com/players/Keymer.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Khalifman.zip`](https://www.pgnmentor.com/players/Khalifman.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Kholmov.zip`](https://www.pgnmentor.com/players/Kholmov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Koneru.zip`](https://www.pgnmentor.com/players/Koneru.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Korchnoi.zip`](https://www.pgnmentor.com/players/Korchnoi.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Korobov.zip`](https://www.pgnmentor.com/players/Korobov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Kosteniuk.zip`](https://www.pgnmentor.com/players/Kosteniuk.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Kotov.zip`](https://www.pgnmentor.com/players/Kotov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Kramnik.zip`](https://www.pgnmentor.com/players/Kramnik.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Krasenkow.zip`](https://www.pgnmentor.com/players/Krasenkow.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Krush.zip`](https://www.pgnmentor.com/players/Krush.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Kudrin.zip`](https://www.pgnmentor.com/players/Kudrin.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Lahno.zip`](https://www.pgnmentor.com/players/Lahno.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Larsen.zip`](https://www.pgnmentor.com/players/Larsen.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Lasker.zip`](https://www.pgnmentor.com/players/Lasker.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Lautier.zip`](https://www.pgnmentor.com/players/Lautier.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Le.zip`](https://www.pgnmentor.com/players/Le.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Leko.zip`](https://www.pgnmentor.com/players/Leko.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Levenfish.zip`](https://www.pgnmentor.com/players/Levenfish.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Li.zip`](https://www.pgnmentor.com/players/Li.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Lilienthal.zip`](https://www.pgnmentor.com/players/Lilienthal.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Ljubojevic.zip`](https://www.pgnmentor.com/players/Ljubojevic.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Lputian.zip`](https://www.pgnmentor.com/players/Lputian.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`MacKenzie.zip`](https://www.pgnmentor.com/players/MacKenzie.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Malakhov.zip`](https://www.pgnmentor.com/players/Malakhov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Mamedyarov.zip`](https://www.pgnmentor.com/players/Mamedyarov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Maroczy.zip`](https://www.pgnmentor.com/players/Maroczy.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Marshall.zip`](https://www.pgnmentor.com/players/Marshall.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`McDonnell.zip`](https://www.pgnmentor.com/players/McDonnell.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`McShane.zip`](https://www.pgnmentor.com/players/McShane.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Mecking.zip`](https://www.pgnmentor.com/players/Mecking.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Mikenas.zip`](https://www.pgnmentor.com/players/Mikenas.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Miles.zip`](https://www.pgnmentor.com/players/Miles.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Milov.zip`](https://www.pgnmentor.com/players/Milov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Morozevich.zip`](https://www.pgnmentor.com/players/Morozevich.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Morphy.zip`](https://www.pgnmentor.com/players/Morphy.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Motylev.zip`](https://www.pgnmentor.com/players/Motylev.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Movsesian.zip`](https://www.pgnmentor.com/players/Movsesian.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Muzychuk.zip`](https://www.pgnmentor.com/players/Muzychuk.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Najdorf.zip`](https://www.pgnmentor.com/players/Najdorf.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Najer.zip`](https://www.pgnmentor.com/players/Najer.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Nakamura.zip`](https://www.pgnmentor.com/players/Nakamura.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Navara.zip`](https://www.pgnmentor.com/players/Navara.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Negi.zip`](https://www.pgnmentor.com/players/Negi.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Nepomniachtchi.zip`](https://www.pgnmentor.com/players/Nepomniachtchi.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Ni.zip`](https://www.pgnmentor.com/players/Ni.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Nielsen.zip`](https://www.pgnmentor.com/players/Nielsen.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Nikolic.zip`](https://www.pgnmentor.com/players/Nikolic.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Nimzowitsch.zip`](https://www.pgnmentor.com/players/Nimzowitsch.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Nisipeanu.zip`](https://www.pgnmentor.com/players/Nisipeanu.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Novikov.zip`](https://www.pgnmentor.com/players/Novikov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Nunn.zip`](https://www.pgnmentor.com/players/Nunn.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Olafsson.zip`](https://www.pgnmentor.com/players/Olafsson.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Oll.zip`](https://www.pgnmentor.com/players/Oll.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Onischuk.zip`](https://www.pgnmentor.com/players/Onischuk.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Pachman.zip`](https://www.pgnmentor.com/players/Pachman.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Paehtz.zip`](https://www.pgnmentor.com/players/Paehtz.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Panno.zip`](https://www.pgnmentor.com/players/Panno.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Paulsen.zip`](https://www.pgnmentor.com/players/Paulsen.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Petrosian.zip`](https://www.pgnmentor.com/players/Petrosian.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Philidor.zip`](https://www.pgnmentor.com/players/Philidor.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Pillsbury.zip`](https://www.pgnmentor.com/players/Pillsbury.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Pilnik.zip`](https://www.pgnmentor.com/players/Pilnik.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`PolgarJ.zip`](https://www.pgnmentor.com/players/PolgarJ.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`PolgarS.zip`](https://www.pgnmentor.com/players/PolgarS.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`PolgarZ.zip`](https://www.pgnmentor.com/players/PolgarZ.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Polugaevsky.zip`](https://www.pgnmentor.com/players/Polugaevsky.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Ponomariov.zip`](https://www.pgnmentor.com/players/Ponomariov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Portisch.zip`](https://www.pgnmentor.com/players/Portisch.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Praggnanandhaa.zip`](https://www.pgnmentor.com/players/Praggnanandhaa.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Psakhis.zip`](https://www.pgnmentor.com/players/Psakhis.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Quinteros.zip`](https://www.pgnmentor.com/players/Quinteros.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Radjabov.zip`](https://www.pgnmentor.com/players/Radjabov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Rapport.zip`](https://www.pgnmentor.com/players/Rapport.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Reshevsky.zip`](https://www.pgnmentor.com/players/Reshevsky.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Reti.zip`](https://www.pgnmentor.com/players/Reti.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Ribli.zip`](https://www.pgnmentor.com/players/Ribli.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Rohde.zip`](https://www.pgnmentor.com/players/Rohde.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Rubinstein.zip`](https://www.pgnmentor.com/players/Rubinstein.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Rublevsky.zip`](https://www.pgnmentor.com/players/Rublevsky.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Saemisch.zip`](https://www.pgnmentor.com/players/Saemisch.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Sakaev.zip`](https://www.pgnmentor.com/players/Sakaev.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Salov.zip`](https://www.pgnmentor.com/players/Salov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Sasikiran.zip`](https://www.pgnmentor.com/players/Sasikiran.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Schlechter.zip`](https://www.pgnmentor.com/players/Schlechter.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Seirawan.zip`](https://www.pgnmentor.com/players/Seirawan.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Serper.zip`](https://www.pgnmentor.com/players/Serper.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Shabalov.zip`](https://www.pgnmentor.com/players/Shabalov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Shamkovich.zip`](https://www.pgnmentor.com/players/Shamkovich.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Shirov.zip`](https://www.pgnmentor.com/players/Shirov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Short.zip`](https://www.pgnmentor.com/players/Short.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Shulman.zip`](https://www.pgnmentor.com/players/Shulman.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Smirin.zip`](https://www.pgnmentor.com/players/Smirin.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Smyslov.zip`](https://www.pgnmentor.com/players/Smyslov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`So.zip`](https://www.pgnmentor.com/players/So.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Sokolov.zip`](https://www.pgnmentor.com/players/Sokolov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Soltis.zip`](https://www.pgnmentor.com/players/Soltis.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Spassky.zip`](https://www.pgnmentor.com/players/Spassky.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Speelman.zip`](https://www.pgnmentor.com/players/Speelman.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Spielmann.zip`](https://www.pgnmentor.com/players/Spielmann.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Stahlberg.zip`](https://www.pgnmentor.com/players/Stahlberg.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Staunton.zip`](https://www.pgnmentor.com/players/Staunton.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Stefanova.zip`](https://www.pgnmentor.com/players/Stefanova.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Stein.zip`](https://www.pgnmentor.com/players/Stein.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Steinitz.zip`](https://www.pgnmentor.com/players/Steinitz.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Suetin.zip`](https://www.pgnmentor.com/players/Suetin.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`SultanKhan.zip`](https://www.pgnmentor.com/players/SultanKhan.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Sutovsky.zip`](https://www.pgnmentor.com/players/Sutovsky.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Svidler.zip`](https://www.pgnmentor.com/players/Svidler.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Szabo.zip`](https://www.pgnmentor.com/players/Szabo.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Taimanov.zip`](https://www.pgnmentor.com/players/Taimanov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Tal.zip`](https://www.pgnmentor.com/players/Tal.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Tarrasch.zip`](https://www.pgnmentor.com/players/Tarrasch.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Tartakower.zip`](https://www.pgnmentor.com/players/Tartakower.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Teichmann.zip`](https://www.pgnmentor.com/players/Teichmann.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Timman.zip`](https://www.pgnmentor.com/players/Timman.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Tiviakov.zip`](https://www.pgnmentor.com/players/Tiviakov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Tkachiev.zip`](https://www.pgnmentor.com/players/Tkachiev.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Tomashevsky.zip`](https://www.pgnmentor.com/players/Tomashevsky.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Topalov.zip`](https://www.pgnmentor.com/players/Topalov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`TorreRepetto.zip`](https://www.pgnmentor.com/players/TorreRepetto.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Uhlmann.zip`](https://www.pgnmentor.com/players/Uhlmann.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Unzicker.zip`](https://www.pgnmentor.com/players/Unzicker.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Ushenina.zip`](https://www.pgnmentor.com/players/Ushenina.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`VachierLagrave.zip`](https://www.pgnmentor.com/players/VachierLagrave.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Vaganian.zip`](https://www.pgnmentor.com/players/Vaganian.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`VallejoPons.zip`](https://www.pgnmentor.com/players/VallejoPons.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`VanWely.zip`](https://www.pgnmentor.com/players/VanWely.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Vitiugov.zip`](https://www.pgnmentor.com/players/Vitiugov.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Volokitin.zip`](https://www.pgnmentor.com/players/Volokitin.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Waitzkin.zip`](https://www.pgnmentor.com/players/Waitzkin.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Wang.zip`](https://www.pgnmentor.com/players/Wang.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`WangH.zip`](https://www.pgnmentor.com/players/WangH.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Wei.zip`](https://www.pgnmentor.com/players/Wei.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Winawer.zip`](https://www.pgnmentor.com/players/Winawer.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Wojtaszek.zip`](https://www.pgnmentor.com/players/Wojtaszek.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Wojtkiewicz.zip`](https://www.pgnmentor.com/players/Wojtkiewicz.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Wolff.zip`](https://www.pgnmentor.com/players/Wolff.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Xie.zip`](https://www.pgnmentor.com/players/Xie.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Xu.zip`](https://www.pgnmentor.com/players/Xu.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Ye.zip`](https://www.pgnmentor.com/players/Ye.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Yermolinsky.zip`](https://www.pgnmentor.com/players/Yermolinsky.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Yu.zip`](https://www.pgnmentor.com/players/Yu.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Yudasin.zip`](https://www.pgnmentor.com/players/Yudasin.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Zhu.zip`](https://www.pgnmentor.com/players/Zhu.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Zukertort.zip`](https://www.pgnmentor.com/players/Zukertort.zip) |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`Zvjaginsev.zip`](https://www.pgnmentor.com/players/Zvjaginsev.zip) |
<!-- /sources -->

## Counting Again

A fresh clone reproduces every count on this page by running `mise run data:fetch` and `mise run data:index`, then `mise run docs:render`, and the counts on [Game Lengths](lengths.md) come from the same index.

[^edwards1994]: Edwards, Steven J. 1994. "Standard: Portable Game Notation Specification and Implementation Guide," Section 8.1.1, Seven Tag Roster. <https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm>
