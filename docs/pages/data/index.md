# Data

*Scotch* matches a game against the <!-- games -->1,150,156<!-- /games --> games the store holds, read from the <!-- files -->1,465<!-- /files --> files [PGN Mentor](https://www.pgnmentor.com/files.html) publishes across three sections of its site. The <!-- players-files -->250<!-- /players-files --> Players archives each hold every game PGN Mentor collects for one player, and the store keeps all of them, as it keeps every game of the <!-- events-files -->982<!-- /events-files --> Events files, each a tournament or a match. The <!-- openings-files -->233<!-- /openings-files --> Openings archives each hold the games of one opening, and the store keeps a game of theirs only where the higher of the ratings its `WhiteElo` and `BlackElo` tags give reaches <!-- openings-floor -->2500<!-- /openings-floor -->,[^edwards1994b] the rating FIDE sets for the grandmaster title through norms,[^fide2024] a floor `sources.toml` declares once beside its files. A game two files both hold, such as one between two players who each have an archive, is kept once, under the file `sources.toml` declares first, which lists the Players ahead of the Events and the Events ahead of the Openings, two copies counting as one game where their Seven Tag Roster and their moves agree.[^edwards1994]

Each page of this section answers one question about the store:

| **Page** | **Question It Answers** |
|---|---|
| [Data](index.md) | *When were the stored games played, and which files hold them?* |
| [Game Lengths](lengths.md) | *How long do the stored games run, by decade and by result?* |
| [Shared Positions](shared.md) | *How long do the stored games stay in positions another stored game reaches, and how crowded are those positions?* |
| [Tags](tags.md) | *Which tags do the stored games carry, how precisely are they dated, and which ratings do they carry?* |
| [Games Left Out](omitted.md) | *Which games do the fetched files hold that the index leaves out, and why?* |

## The Decades Played

The stored games run from the <!-- earliest -->1740s<!-- /earliest --> to the present, and <!-- recent -->92%<!-- /recent --> of them were played since <!-- recent-from -->1980<!-- /recent-from -->. A game whose `Date` tag carries no year counts as undated and stays out of the decades, which leaves out the undated games, <!-- undated -->1<!-- /undated --> in all. The strip below shades each decade by how many games it holds, the earliest decades sharing its first cell, and the table beneath it counts every decade, each read from the index by `mise run docs:render`.

<!-- decades -->
| **Decade** | **Games** | **Played by Its End** |
|---|---:|---:|
| 1740s | 1 | 0.0% |
| 1780s | 2 | 0.0% |
| 1790s | 3 | 0.0% |
| 1820s | 1 | 0.0% |
| 1830s | 121 | 0.0% |
| 1840s | 248 | 0.0% |
| 1850s | 748 | 0.1% |
| 1860s | 729 | 0.2% |
| 1870s | 921 | 0.2% |
| 1880s | 2,075 | 0.4% |
| 1890s | 2,380 | 0.6% |
| 1900s | 4,648 | 1.0% |
| 1910s | 2,719 | 1.3% |
| 1920s | 6,735 | 1.9% |
| 1930s | 8,124 | 2.6% |
| 1940s | 6,957 | 3.2% |
| 1950s | 12,067 | 4.2% |
| 1960s | 17,753 | 5.8% |
| 1970s | 25,845 | 8.0% |
| 1980s | 48,522 | 12.2% |
| 1990s | 137,036 | 24.1% |
| 2000s | 191,385 | 40.8% |
| 2010s | 300,702 | 66.9% |
| 2020s | 380,433 | 100.0% |
<!-- /decades -->

## The Files

The drawing below sets each file under its section's tab, the Players as discs at the mean year of their games, the Events as bricks stacked in the year most of their games were played, and the Openings as bands by first move and reply, each as wide as the games the store holds from it. The field above it finds a file by its name or its title, and the card beneath names the file a pointer rests on, its games, and the decades they were played in, with the file of the same name under another section on a tab under the card. The table beneath names each file the store draws from, the provider publishing it, and the section of the provider's site listing it, written from `src/scotch/sources/sources.toml` by `mise run docs:render`.

<!-- sources -->
| **Provider** | **Section** | **File** | **Name** |
|---|---|---|---|
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Abdusattorov.zip`](https://www.pgnmentor.com/players/Abdusattorov.zip) | Nodirbek Abdusattorov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Adams.zip`](https://www.pgnmentor.com/players/Adams.zip) | Michael Adams |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Akobian.zip`](https://www.pgnmentor.com/players/Akobian.zip) | Varuzhan Akobian |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Akopian.zip`](https://www.pgnmentor.com/players/Akopian.zip) | Vladimir Akopian |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Alburt.zip`](https://www.pgnmentor.com/players/Alburt.zip) | Lev Alburt |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Alekhine.zip`](https://www.pgnmentor.com/players/Alekhine.zip) | Alexander Alekhine |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Alekseev.zip`](https://www.pgnmentor.com/players/Alekseev.zip) | Evgeny Alekseev |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Almasi.zip`](https://www.pgnmentor.com/players/Almasi.zip) | Zoltan Almasi |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Anand.zip`](https://www.pgnmentor.com/players/Anand.zip) | Viswanathan Anand |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Anderssen.zip`](https://www.pgnmentor.com/players/Anderssen.zip) | Adolf Anderssen |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Andersson.zip`](https://www.pgnmentor.com/players/Andersson.zip) | Ulf Andersson |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Andreikin.zip`](https://www.pgnmentor.com/players/Andreikin.zip) | Dmitry Andreikin |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Aronian.zip`](https://www.pgnmentor.com/players/Aronian.zip) | Levon Aronian |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Ashley.zip`](https://www.pgnmentor.com/players/Ashley.zip) | Maurice Ashley |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Averbakh.zip`](https://www.pgnmentor.com/players/Averbakh.zip) | Yuri Averbakh |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Azmaiparashvili.zip`](https://www.pgnmentor.com/players/Azmaiparashvili.zip) | Zurab Azmaiparashvili |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Bacrot.zip`](https://www.pgnmentor.com/players/Bacrot.zip) | Etienne Bacrot |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Bareev.zip`](https://www.pgnmentor.com/players/Bareev.zip) | Evgeny Bareev |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/BecerraRivero.zip`](https://www.pgnmentor.com/players/BecerraRivero.zip) | Julio Becerra Rivero |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Beliavsky.zip`](https://www.pgnmentor.com/players/Beliavsky.zip) | Alexander Beliavsky |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Benjamin.zip`](https://www.pgnmentor.com/players/Benjamin.zip) | Joel Benjamin |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Benko.zip`](https://www.pgnmentor.com/players/Benko.zip) | Pal Benko |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Berliner.zip`](https://www.pgnmentor.com/players/Berliner.zip) | Hans Berliner |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Bernstein.zip`](https://www.pgnmentor.com/players/Bernstein.zip) | Ossip Bernstein |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Bird.zip`](https://www.pgnmentor.com/players/Bird.zip) | Henry Bird |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Bisguier.zip`](https://www.pgnmentor.com/players/Bisguier.zip) | Arthur Bisguier |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Blackburne.zip`](https://www.pgnmentor.com/players/Blackburne.zip) | Joseph Blackburne |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Blatny.zip`](https://www.pgnmentor.com/players/Blatny.zip) | Pavel Blatny |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Bogoljubow.zip`](https://www.pgnmentor.com/players/Bogoljubow.zip) | Efim Bogoljubow |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Boleslavsky.zip`](https://www.pgnmentor.com/players/Boleslavsky.zip) | Isaac Boleslavsky |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Bologan.zip`](https://www.pgnmentor.com/players/Bologan.zip) | Viktor Bologan |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Botvinnik.zip`](https://www.pgnmentor.com/players/Botvinnik.zip) | Mikhail Botvinnik |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Breyer.zip`](https://www.pgnmentor.com/players/Breyer.zip) | Gyula Breyer |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Bronstein.zip`](https://www.pgnmentor.com/players/Bronstein.zip) | David Bronstein |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Browne.zip`](https://www.pgnmentor.com/players/Browne.zip) | Walter Browne |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Bruzon.zip`](https://www.pgnmentor.com/players/Bruzon.zip) | Lazaro Bruzon |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Bu.zip`](https://www.pgnmentor.com/players/Bu.zip) | Bu Xiangzhi |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Byrne.zip`](https://www.pgnmentor.com/players/Byrne.zip) | Robert Byrne |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Capablanca.zip`](https://www.pgnmentor.com/players/Capablanca.zip) | José Raúl Capablanca |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Carlsen.zip`](https://www.pgnmentor.com/players/Carlsen.zip) | Magnus Carlsen |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Caruana.zip`](https://www.pgnmentor.com/players/Caruana.zip) | Fabiano Caruana |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Chiburdanidze.zip`](https://www.pgnmentor.com/players/Chiburdanidze.zip) | Maia Chiburdanidze |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Chigorin.zip`](https://www.pgnmentor.com/players/Chigorin.zip) | Mikhail Chigorin |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Christiansen.zip`](https://www.pgnmentor.com/players/Christiansen.zip) | Larry Christiansen |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/DeFirmian.zip`](https://www.pgnmentor.com/players/DeFirmian.zip) | Nick DeFirmian |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/DeLaBourdonnais.zip`](https://www.pgnmentor.com/players/DeLaBourdonnais.zip) | Louis de LaBourdonnais |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Denker.zip`](https://www.pgnmentor.com/players/Denker.zip) | Arnold Denker |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Ding.zip`](https://www.pgnmentor.com/players/Ding.zip) | Ding Liren |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/DominguezPerez.zip`](https://www.pgnmentor.com/players/DominguezPerez.zip) | Leinier Dominguez Perez |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Dreev.zip`](https://www.pgnmentor.com/players/Dreev.zip) | Alexey Dreev |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Duda.zip`](https://www.pgnmentor.com/players/Duda.zip) | Jan-Krzysztof Duda |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Dzindzichashvili.zip`](https://www.pgnmentor.com/players/Dzindzichashvili.zip) | Roman Dzindzichashvili |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Ehlvest.zip`](https://www.pgnmentor.com/players/Ehlvest.zip) | Jaan Ehlvest |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Eljanov.zip`](https://www.pgnmentor.com/players/Eljanov.zip) | Pavel Eljanov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Erigaisi.zip`](https://www.pgnmentor.com/players/Erigaisi.zip) | Arjun Erigaisi |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Euwe.zip`](https://www.pgnmentor.com/players/Euwe.zip) | Max Euwe |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Evans.zip`](https://www.pgnmentor.com/players/Evans.zip) | Larry Evans |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Fedorowicz.zip`](https://www.pgnmentor.com/players/Fedorowicz.zip) | John Fedorowicz |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Fine.zip`](https://www.pgnmentor.com/players/Fine.zip) | Reuben Fine |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Finegold.zip`](https://www.pgnmentor.com/players/Finegold.zip) | Benjamin Finegold |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Firouzja.zip`](https://www.pgnmentor.com/players/Firouzja.zip) | Alireza Firouzja |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Fischer.zip`](https://www.pgnmentor.com/players/Fischer.zip) | Robert James Fischer |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Fishbein.zip`](https://www.pgnmentor.com/players/Fishbein.zip) | Alexander Fishbein |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Flohr.zip`](https://www.pgnmentor.com/players/Flohr.zip) | Salo Flohr |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Gaprindashvili.zip`](https://www.pgnmentor.com/players/Gaprindashvili.zip) | Nona Gaprindashvili |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Gashimov.zip`](https://www.pgnmentor.com/players/Gashimov.zip) | Vugar Gashimov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Gelfand.zip`](https://www.pgnmentor.com/players/Gelfand.zip) | Boris Gelfand |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Geller.zip`](https://www.pgnmentor.com/players/Geller.zip) | Efim Geller |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Georgiev.zip`](https://www.pgnmentor.com/players/Georgiev.zip) | Kiril Georgiev |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Giri.zip`](https://www.pgnmentor.com/players/Giri.zip) | Anish Giri |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Gligoric.zip`](https://www.pgnmentor.com/players/Gligoric.zip) | Svetozar Gligoric |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Goldin.zip`](https://www.pgnmentor.com/players/Goldin.zip) | Alexander Goldin |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/GrandaZuniga.zip`](https://www.pgnmentor.com/players/GrandaZuniga.zip) | Julio Granda Zuniga |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Grischuk.zip`](https://www.pgnmentor.com/players/Grischuk.zip) | Alexander Grischuk |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Gukesh.zip`](https://www.pgnmentor.com/players/Gukesh.zip) | Dommaraju Gukesh |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Gulko.zip`](https://www.pgnmentor.com/players/Gulko.zip) | Boris Gulko |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Gunsberg.zip`](https://www.pgnmentor.com/players/Gunsberg.zip) | Isidor Gunsberg |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/GurevichD.zip`](https://www.pgnmentor.com/players/GurevichD.zip) | Dmitry Gurevich |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/GurevichM.zip`](https://www.pgnmentor.com/players/GurevichM.zip) | Mikhail Gurevich |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Harikrishna.zip`](https://www.pgnmentor.com/players/Harikrishna.zip) | Pentala Harikrishna |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Hort.zip`](https://www.pgnmentor.com/players/Hort.zip) | Vlastimil Hort |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Horwitz.zip`](https://www.pgnmentor.com/players/Horwitz.zip) | Bernhard Horwitz |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Hou.zip`](https://www.pgnmentor.com/players/Hou.zip) | Hou Yifan |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Huebner.zip`](https://www.pgnmentor.com/players/Huebner.zip) | Robert Huebner |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Ibragimov.zip`](https://www.pgnmentor.com/players/Ibragimov.zip) | Ildar Ibragimov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/IllescasCordoba.zip`](https://www.pgnmentor.com/players/IllescasCordoba.zip) | Miguel Illescas Cordoba |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Inarkiev.zip`](https://www.pgnmentor.com/players/Inarkiev.zip) | Ernesto Inarkiev |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Ivanchuk.zip`](https://www.pgnmentor.com/players/Ivanchuk.zip) | Vassily Ivanchuk |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/IvanovA.zip`](https://www.pgnmentor.com/players/IvanovA.zip) | Alexander Ivanov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/IvanovI.zip`](https://www.pgnmentor.com/players/IvanovI.zip) | Igor Ivanov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Ivkov.zip`](https://www.pgnmentor.com/players/Ivkov.zip) | Borislav Ivkov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Jakovenko.zip`](https://www.pgnmentor.com/players/Jakovenko.zip) | Dmitry Jakovenko |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Janowski.zip`](https://www.pgnmentor.com/players/Janowski.zip) | David Janowski |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Jobava.zip`](https://www.pgnmentor.com/players/Jobava.zip) | Baadur Jobava |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Jussupow.zip`](https://www.pgnmentor.com/players/Jussupow.zip) | Artur Jussupow |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Kaidanov.zip`](https://www.pgnmentor.com/players/Kaidanov.zip) | Gregory Kaidanov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Kamsky.zip`](https://www.pgnmentor.com/players/Kamsky.zip) | Gata Kamsky |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Karjakin.zip`](https://www.pgnmentor.com/players/Karjakin.zip) | Sergey Karjakin |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Karpov.zip`](https://www.pgnmentor.com/players/Karpov.zip) | Anatoly Karpov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Kasimdzhanov.zip`](https://www.pgnmentor.com/players/Kasimdzhanov.zip) | Rustam Kasimdzhanov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Kasparov.zip`](https://www.pgnmentor.com/players/Kasparov.zip) | Garry Kasparov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Kavalek.zip`](https://www.pgnmentor.com/players/Kavalek.zip) | Lubomir Kavalek |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Keres.zip`](https://www.pgnmentor.com/players/Keres.zip) | Paul Keres |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Keymer.zip`](https://www.pgnmentor.com/players/Keymer.zip) | Vincent Keymer |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Khalifman.zip`](https://www.pgnmentor.com/players/Khalifman.zip) | Alexander Khalifman |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Kholmov.zip`](https://www.pgnmentor.com/players/Kholmov.zip) | Ratmir Kholmov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Koneru.zip`](https://www.pgnmentor.com/players/Koneru.zip) | Koneru Humpy |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Korchnoi.zip`](https://www.pgnmentor.com/players/Korchnoi.zip) | Viktor Korchnoi |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Korobov.zip`](https://www.pgnmentor.com/players/Korobov.zip) | Anton Korobov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Kosteniuk.zip`](https://www.pgnmentor.com/players/Kosteniuk.zip) | Alexandra Kosteniuk |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Kotov.zip`](https://www.pgnmentor.com/players/Kotov.zip) | Alexander Kotov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Kramnik.zip`](https://www.pgnmentor.com/players/Kramnik.zip) | Vladimir Kramnik |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Krasenkow.zip`](https://www.pgnmentor.com/players/Krasenkow.zip) | Michal Krasenkow |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Krush.zip`](https://www.pgnmentor.com/players/Krush.zip) | Irina Krush |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Kudrin.zip`](https://www.pgnmentor.com/players/Kudrin.zip) | Sergey Kudrin |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Lahno.zip`](https://www.pgnmentor.com/players/Lahno.zip) | Kateryna Lahno |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Larsen.zip`](https://www.pgnmentor.com/players/Larsen.zip) | Bent Larsen |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Lasker.zip`](https://www.pgnmentor.com/players/Lasker.zip) | Emanuel Lasker |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Lautier.zip`](https://www.pgnmentor.com/players/Lautier.zip) | Joel Lautier |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Le.zip`](https://www.pgnmentor.com/players/Le.zip) | Le Quang Liem |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Leko.zip`](https://www.pgnmentor.com/players/Leko.zip) | Peter Leko |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Levenfish.zip`](https://www.pgnmentor.com/players/Levenfish.zip) | Grigory Levenfish |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Li.zip`](https://www.pgnmentor.com/players/Li.zip) | Li Chao |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Lilienthal.zip`](https://www.pgnmentor.com/players/Lilienthal.zip) | Andre Lilienthal |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Ljubojevic.zip`](https://www.pgnmentor.com/players/Ljubojevic.zip) | Ljubomir Ljubojevic |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Lputian.zip`](https://www.pgnmentor.com/players/Lputian.zip) | Smbat Lputian |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/MacKenzie.zip`](https://www.pgnmentor.com/players/MacKenzie.zip) | George MacKenzie |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Malakhov.zip`](https://www.pgnmentor.com/players/Malakhov.zip) | Vladimir Malakhov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Mamedyarov.zip`](https://www.pgnmentor.com/players/Mamedyarov.zip) | Shakhriyar Mamedyarov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Maroczy.zip`](https://www.pgnmentor.com/players/Maroczy.zip) | Geza Maroczy |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Marshall.zip`](https://www.pgnmentor.com/players/Marshall.zip) | Frank Marshall |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/McDonnell.zip`](https://www.pgnmentor.com/players/McDonnell.zip) | Alexander McDonnell |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/McShane.zip`](https://www.pgnmentor.com/players/McShane.zip) | Luke McShane |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Mecking.zip`](https://www.pgnmentor.com/players/Mecking.zip) | Henrique Mecking |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Mikenas.zip`](https://www.pgnmentor.com/players/Mikenas.zip) | Vladas Mikenas |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Miles.zip`](https://www.pgnmentor.com/players/Miles.zip) | Anthony Miles |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Milov.zip`](https://www.pgnmentor.com/players/Milov.zip) | Vadim Milov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Morozevich.zip`](https://www.pgnmentor.com/players/Morozevich.zip) | Alexander Morozevich |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Morphy.zip`](https://www.pgnmentor.com/players/Morphy.zip) | Paul Morphy |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Motylev.zip`](https://www.pgnmentor.com/players/Motylev.zip) | Alexander Motylev |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Movsesian.zip`](https://www.pgnmentor.com/players/Movsesian.zip) | Sergei Movsesian |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Muzychuk.zip`](https://www.pgnmentor.com/players/Muzychuk.zip) | Mariya Muzychuk |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Najdorf.zip`](https://www.pgnmentor.com/players/Najdorf.zip) | Miguel Najdorf |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Najer.zip`](https://www.pgnmentor.com/players/Najer.zip) | Evgeny Najer |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Nakamura.zip`](https://www.pgnmentor.com/players/Nakamura.zip) | Hikaru Nakamura |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Navara.zip`](https://www.pgnmentor.com/players/Navara.zip) | David Navara |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Negi.zip`](https://www.pgnmentor.com/players/Negi.zip) | Parimarjan Negi |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Nepomniachtchi.zip`](https://www.pgnmentor.com/players/Nepomniachtchi.zip) | Ian Nepomniachtchi |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Ni.zip`](https://www.pgnmentor.com/players/Ni.zip) | Ni Hua |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Nielsen.zip`](https://www.pgnmentor.com/players/Nielsen.zip) | Peter Nielsen |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Nikolic.zip`](https://www.pgnmentor.com/players/Nikolic.zip) | Predrag Nikolic |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Nimzowitsch.zip`](https://www.pgnmentor.com/players/Nimzowitsch.zip) | Aron Nimzowitsch |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Nisipeanu.zip`](https://www.pgnmentor.com/players/Nisipeanu.zip) | Liviu-Dieter Nisipeanu |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Novikov.zip`](https://www.pgnmentor.com/players/Novikov.zip) | Igor Novikov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Nunn.zip`](https://www.pgnmentor.com/players/Nunn.zip) | John Nunn |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Olafsson.zip`](https://www.pgnmentor.com/players/Olafsson.zip) | Fridrik Olafsson |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Oll.zip`](https://www.pgnmentor.com/players/Oll.zip) | Lembit Oll |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Onischuk.zip`](https://www.pgnmentor.com/players/Onischuk.zip) | Alexander Onischuk |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Pachman.zip`](https://www.pgnmentor.com/players/Pachman.zip) | Ludek Pachman |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Paehtz.zip`](https://www.pgnmentor.com/players/Paehtz.zip) | Elisabeth Paehtz |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Panno.zip`](https://www.pgnmentor.com/players/Panno.zip) | Oscar Panno |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Paulsen.zip`](https://www.pgnmentor.com/players/Paulsen.zip) | Louis Paulsen |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Petrosian.zip`](https://www.pgnmentor.com/players/Petrosian.zip) | Tigran Petrosian |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Philidor.zip`](https://www.pgnmentor.com/players/Philidor.zip) | Francois Philidor |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Pillsbury.zip`](https://www.pgnmentor.com/players/Pillsbury.zip) | Harry Pillsbury |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Pilnik.zip`](https://www.pgnmentor.com/players/Pilnik.zip) | Herman Pilnik |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/PolgarJ.zip`](https://www.pgnmentor.com/players/PolgarJ.zip) | Judit Polgar |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/PolgarS.zip`](https://www.pgnmentor.com/players/PolgarS.zip) | Sofia Polgar |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/PolgarZ.zip`](https://www.pgnmentor.com/players/PolgarZ.zip) | Zsuzsa Polgar |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Polugaevsky.zip`](https://www.pgnmentor.com/players/Polugaevsky.zip) | Lev Polugaevsky |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Ponomariov.zip`](https://www.pgnmentor.com/players/Ponomariov.zip) | Ruslan Ponomariov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Portisch.zip`](https://www.pgnmentor.com/players/Portisch.zip) | Lajos Portisch |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Praggnanandhaa.zip`](https://www.pgnmentor.com/players/Praggnanandhaa.zip) | Rameshbabu Praggnanandhaa |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Psakhis.zip`](https://www.pgnmentor.com/players/Psakhis.zip) | Lev Psakhis |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Quinteros.zip`](https://www.pgnmentor.com/players/Quinteros.zip) | Miguel Quinteros |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Radjabov.zip`](https://www.pgnmentor.com/players/Radjabov.zip) | Teimour Radjabov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Rapport.zip`](https://www.pgnmentor.com/players/Rapport.zip) | Richard Rapport |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Reshevsky.zip`](https://www.pgnmentor.com/players/Reshevsky.zip) | Samuel Reshevsky |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Reti.zip`](https://www.pgnmentor.com/players/Reti.zip) | Richard Reti |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Ribli.zip`](https://www.pgnmentor.com/players/Ribli.zip) | Zoltan Ribli |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Rohde.zip`](https://www.pgnmentor.com/players/Rohde.zip) | Michael Rohde |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Rubinstein.zip`](https://www.pgnmentor.com/players/Rubinstein.zip) | Akiba Rubinstein |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Rublevsky.zip`](https://www.pgnmentor.com/players/Rublevsky.zip) | Sergei Rublevsky |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Saemisch.zip`](https://www.pgnmentor.com/players/Saemisch.zip) | Friedrich Saemisch |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Sakaev.zip`](https://www.pgnmentor.com/players/Sakaev.zip) | Konstantin Sakaev |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Salov.zip`](https://www.pgnmentor.com/players/Salov.zip) | Valery Salov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Sasikiran.zip`](https://www.pgnmentor.com/players/Sasikiran.zip) | Krishnan Sasikiran |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Schlechter.zip`](https://www.pgnmentor.com/players/Schlechter.zip) | Carl Schlechter |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Seirawan.zip`](https://www.pgnmentor.com/players/Seirawan.zip) | Yasser Seirawan |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Serper.zip`](https://www.pgnmentor.com/players/Serper.zip) | Gregory Serper |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Shabalov.zip`](https://www.pgnmentor.com/players/Shabalov.zip) | Alexander Shabalov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Shamkovich.zip`](https://www.pgnmentor.com/players/Shamkovich.zip) | Leonid Shamkovich |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Shirov.zip`](https://www.pgnmentor.com/players/Shirov.zip) | Alexei Shirov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Short.zip`](https://www.pgnmentor.com/players/Short.zip) | Nigel Short |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Shulman.zip`](https://www.pgnmentor.com/players/Shulman.zip) | Yury Shulman |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Smirin.zip`](https://www.pgnmentor.com/players/Smirin.zip) | Ilia Smirin |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Smyslov.zip`](https://www.pgnmentor.com/players/Smyslov.zip) | Vasily Smyslov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/So.zip`](https://www.pgnmentor.com/players/So.zip) | Wesley So |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Sokolov.zip`](https://www.pgnmentor.com/players/Sokolov.zip) | Ivan Sokolov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Soltis.zip`](https://www.pgnmentor.com/players/Soltis.zip) | Andrew Soltis |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Spassky.zip`](https://www.pgnmentor.com/players/Spassky.zip) | Boris Spassky |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Speelman.zip`](https://www.pgnmentor.com/players/Speelman.zip) | Jonathan Speelman |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Spielmann.zip`](https://www.pgnmentor.com/players/Spielmann.zip) | Rudolf Spielmann |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Stahlberg.zip`](https://www.pgnmentor.com/players/Stahlberg.zip) | Gideon Stahlberg |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Staunton.zip`](https://www.pgnmentor.com/players/Staunton.zip) | Howard Staunton |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Stefanova.zip`](https://www.pgnmentor.com/players/Stefanova.zip) | Antoaneta Stefanova |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Stein.zip`](https://www.pgnmentor.com/players/Stein.zip) | Leonid Stein |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Steinitz.zip`](https://www.pgnmentor.com/players/Steinitz.zip) | William Steinitz |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Suetin.zip`](https://www.pgnmentor.com/players/Suetin.zip) | Alexey Suetin |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/SultanKhan.zip`](https://www.pgnmentor.com/players/SultanKhan.zip) | Mir Sultan Khan |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Sutovsky.zip`](https://www.pgnmentor.com/players/Sutovsky.zip) | Emil Sutovsky |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Svidler.zip`](https://www.pgnmentor.com/players/Svidler.zip) | Peter Svidler |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Szabo.zip`](https://www.pgnmentor.com/players/Szabo.zip) | Laszlo Szabo |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Taimanov.zip`](https://www.pgnmentor.com/players/Taimanov.zip) | Mark Taimanov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Tal.zip`](https://www.pgnmentor.com/players/Tal.zip) | Mikhail Tal |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Tarrasch.zip`](https://www.pgnmentor.com/players/Tarrasch.zip) | Siegbert Tarrasch |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Tartakower.zip`](https://www.pgnmentor.com/players/Tartakower.zip) | Savielly Tartakower |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Teichmann.zip`](https://www.pgnmentor.com/players/Teichmann.zip) | Richard Teichmann |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Timman.zip`](https://www.pgnmentor.com/players/Timman.zip) | Jan Timman |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Tiviakov.zip`](https://www.pgnmentor.com/players/Tiviakov.zip) | Sergei Tiviakov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Tkachiev.zip`](https://www.pgnmentor.com/players/Tkachiev.zip) | Vladislav Tkachiev |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Tomashevsky.zip`](https://www.pgnmentor.com/players/Tomashevsky.zip) | Evgeny Tomashevsky |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Topalov.zip`](https://www.pgnmentor.com/players/Topalov.zip) | Veselin Topalov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/TorreRepetto.zip`](https://www.pgnmentor.com/players/TorreRepetto.zip) | Carlos Torre Repetto |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Uhlmann.zip`](https://www.pgnmentor.com/players/Uhlmann.zip) | Wolfgang Uhlmann |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Unzicker.zip`](https://www.pgnmentor.com/players/Unzicker.zip) | Wolfgang Unzicker |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Ushenina.zip`](https://www.pgnmentor.com/players/Ushenina.zip) | Anna Ushenina |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/VachierLagrave.zip`](https://www.pgnmentor.com/players/VachierLagrave.zip) | Maxime Vachier-Lagrave |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Vaganian.zip`](https://www.pgnmentor.com/players/Vaganian.zip) | Rafael Vaganian |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/VallejoPons.zip`](https://www.pgnmentor.com/players/VallejoPons.zip) | Francisco Vallejo Pons |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/VanWely.zip`](https://www.pgnmentor.com/players/VanWely.zip) | Loek Van Wely |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Vitiugov.zip`](https://www.pgnmentor.com/players/Vitiugov.zip) | Nikita Vitiugov |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Volokitin.zip`](https://www.pgnmentor.com/players/Volokitin.zip) | Andrei Volokitin |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Waitzkin.zip`](https://www.pgnmentor.com/players/Waitzkin.zip) | Joshua Waitzkin |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Wang.zip`](https://www.pgnmentor.com/players/Wang.zip) | Wang Yue |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/WangH.zip`](https://www.pgnmentor.com/players/WangH.zip) | Wang Hao |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Wei.zip`](https://www.pgnmentor.com/players/Wei.zip) | Wei Yi |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Winawer.zip`](https://www.pgnmentor.com/players/Winawer.zip) | Simon Winawer |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Wojtaszek.zip`](https://www.pgnmentor.com/players/Wojtaszek.zip) | Radoslaw Wojtaszek |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Wojtkiewicz.zip`](https://www.pgnmentor.com/players/Wojtkiewicz.zip) | Aleksander Wojtkiewicz |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Wolff.zip`](https://www.pgnmentor.com/players/Wolff.zip) | Patrick Wolff |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Xie.zip`](https://www.pgnmentor.com/players/Xie.zip) | Xie Jun |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Xu.zip`](https://www.pgnmentor.com/players/Xu.zip) | Xu Yuhua |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Ye.zip`](https://www.pgnmentor.com/players/Ye.zip) | Ye Jiangchuan |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Yermolinsky.zip`](https://www.pgnmentor.com/players/Yermolinsky.zip) | Alex Yermolinsky |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Yu.zip`](https://www.pgnmentor.com/players/Yu.zip) | Yu Yangyi |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Yudasin.zip`](https://www.pgnmentor.com/players/Yudasin.zip) | Leonid Yudasin |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Zhu.zip`](https://www.pgnmentor.com/players/Zhu.zip) | Zhu Chen |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Zukertort.zip`](https://www.pgnmentor.com/players/Zukertort.zip) | Johannes Zukertort |
| [PGN Mentor](https://www.pgnmentor.com/) | Players | [`players/Zvjaginsev.zip`](https://www.pgnmentor.com/players/Zvjaginsev.zip) | Vadim Zvjaginsev |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Aachen1868.pgn`](https://www.pgnmentor.com/events/Aachen1868.pgn) | Aachen 1868 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Altona1869.pgn`](https://www.pgnmentor.com/events/Altona1869.pgn) | Altona 1869 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Altona1872.pgn`](https://www.pgnmentor.com/events/Altona1872.pgn) | Altona 1872 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Amsterdam1889.pgn`](https://www.pgnmentor.com/events/Amsterdam1889.pgn) | Amsterdam 1889 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Amsterdam1920.pgn`](https://www.pgnmentor.com/events/Amsterdam1920.pgn) | Amsterdam 1920 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Amsterdam1936.pgn`](https://www.pgnmentor.com/events/Amsterdam1936.pgn) | Amsterdam 1936 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Amsterdam1976.pgn`](https://www.pgnmentor.com/events/Amsterdam1976.pgn) | Amsterdam 1976 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Amsterdam1977.pgn`](https://www.pgnmentor.com/events/Amsterdam1977.pgn) | Amsterdam 1977 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Amsterdam1978.pgn`](https://www.pgnmentor.com/events/Amsterdam1978.pgn) | Amsterdam 1978 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Amsterdam1979.pgn`](https://www.pgnmentor.com/events/Amsterdam1979.pgn) | Amsterdam 1979 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Amsterdam1980.pgn`](https://www.pgnmentor.com/events/Amsterdam1980.pgn) | Amsterdam 1980 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Amsterdam1981.pgn`](https://www.pgnmentor.com/events/Amsterdam1981.pgn) | Amsterdam 1981 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Amsterdam1985.pgn`](https://www.pgnmentor.com/events/Amsterdam1985.pgn) | Amsterdam 1985 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Amsterdam1987.pgn`](https://www.pgnmentor.com/events/Amsterdam1987.pgn) | Amsterdam 1987 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Amsterdam1988.pgn`](https://www.pgnmentor.com/events/Amsterdam1988.pgn) | Amsterdam 1988 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Amsterdam1991.pgn`](https://www.pgnmentor.com/events/Amsterdam1991.pgn) | Amsterdam 1991 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Amsterdam1993.pgn`](https://www.pgnmentor.com/events/Amsterdam1993.pgn) | Amsterdam 1993 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Amsterdam1994.pgn`](https://www.pgnmentor.com/events/Amsterdam1994.pgn) | Amsterdam 1994 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Amsterdam1995.pgn`](https://www.pgnmentor.com/events/Amsterdam1995.pgn) | Amsterdam 1995 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Amsterdam1996.pgn`](https://www.pgnmentor.com/events/Amsterdam1996.pgn) | Amsterdam 1996 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Astana2001.pgn`](https://www.pgnmentor.com/events/Astana2001.pgn) | Astana 2001 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/AVRO1938.pgn`](https://www.pgnmentor.com/events/AVRO1938.pgn) | AVRO 1938 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bad1977.pgn`](https://www.pgnmentor.com/events/Bad1977.pgn) | Bad 1977 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/BadElster1937.pgn`](https://www.pgnmentor.com/events/BadElster1937.pgn) | Bad Elster 1937 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/BadElster1938.pgn`](https://www.pgnmentor.com/events/BadElster1938.pgn) | Bad Elster 1938 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/BadElster1939.pgn`](https://www.pgnmentor.com/events/BadElster1939.pgn) | Bad Elster 1939 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Baden1870.pgn`](https://www.pgnmentor.com/events/Baden1870.pgn) | Baden 1870 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Baden1925.pgn`](https://www.pgnmentor.com/events/Baden1925.pgn) | Baden 1925 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Baden1980.pgn`](https://www.pgnmentor.com/events/Baden1980.pgn) | Baden 1980 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Baden2015.pgn`](https://www.pgnmentor.com/events/Baden2015.pgn) | Baden-Baden 2015 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Baden2018.pgn`](https://www.pgnmentor.com/events/Baden2018.pgn) | Baden-Baden 2018 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Baden2019.pgn`](https://www.pgnmentor.com/events/Baden2019.pgn) | Baden-Baden 2019 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/BadHarzburg1938.pgn`](https://www.pgnmentor.com/events/BadHarzburg1938.pgn) | Bad Harzburg 1938 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/BadHarzburg1939.pgn`](https://www.pgnmentor.com/events/BadHarzburg1939.pgn) | Bad Harzburg 1939 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/BadKissingen1928.pgn`](https://www.pgnmentor.com/events/BadKissingen1928.pgn) | Bad Kissingen 1928 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/BadKissingen1980.pgn`](https://www.pgnmentor.com/events/BadKissingen1980.pgn) | Bad Kissingen 1980 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/BadKissingen1981.pgn`](https://www.pgnmentor.com/events/BadKissingen1981.pgn) | Bad Kissingen 1981 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/BadNauheim1935.pgn`](https://www.pgnmentor.com/events/BadNauheim1935.pgn) | Bad Nauheim 1935 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/BadNauheim1936.pgn`](https://www.pgnmentor.com/events/BadNauheim1936.pgn) | Bad Nauheim 1936 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/BadNauheim1937.pgn`](https://www.pgnmentor.com/events/BadNauheim1937.pgn) | Bad Nauheim 1937 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/BadNiendorf1927.pgn`](https://www.pgnmentor.com/events/BadNiendorf1927.pgn) | Bad Niendorf 1927 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/BadOeynhausen1922.pgn`](https://www.pgnmentor.com/events/BadOeynhausen1922.pgn) | Bad Oeynhausen 1922 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/BadPistyan1912.pgn`](https://www.pgnmentor.com/events/BadPistyan1912.pgn) | Bad Pistyan1912 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/BadPistyan1922.pgn`](https://www.pgnmentor.com/events/BadPistyan1922.pgn) | Bad Pistyan1922 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Baku2008.pgn`](https://www.pgnmentor.com/events/Baku2008.pgn) | Baku Grand Prix 2008 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Barcelona1929.pgn`](https://www.pgnmentor.com/events/Barcelona1929.pgn) | Barcelona 1929 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Barcelona1935.pgn`](https://www.pgnmentor.com/events/Barcelona1935.pgn) | Barcelona 1935 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Barcelona1989.pgn`](https://www.pgnmentor.com/events/Barcelona1989.pgn) | Barcelona 1989 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Barmen1869.pgn`](https://www.pgnmentor.com/events/Barmen1869.pgn) | Barmen 1869 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Barmen1905.pgn`](https://www.pgnmentor.com/events/Barmen1905.pgn) | Barmen 1905 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bazna2009.pgn`](https://www.pgnmentor.com/events/Bazna2009.pgn) | Bazna 2009 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bazna2010.pgn`](https://www.pgnmentor.com/events/Bazna2010.pgn) | Bazna 2010 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Beijing2013.pgn`](https://www.pgnmentor.com/events/Beijing2013.pgn) | Beijing GP 2013 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Belfort1988.pgn`](https://www.pgnmentor.com/events/Belfort1988.pgn) | Belfort 1988 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Belgrade1964.pgn`](https://www.pgnmentor.com/events/Belgrade1964.pgn) | Belgrade 1964 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Belgrade1987.pgn`](https://www.pgnmentor.com/events/Belgrade1987.pgn) | Belgrade 1987 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Belgrade1993.pgn`](https://www.pgnmentor.com/events/Belgrade1993.pgn) | Belgrade 1993 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Belgrade1997.pgn`](https://www.pgnmentor.com/events/Belgrade1997.pgn) | Belgrade 1997 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Belgrade2022-GP2.pgn`](https://www.pgnmentor.com/events/Belgrade2022-GP2.pgn) | Belgrade 2022 Grand Prix 2 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Berlin1881.pgn`](https://www.pgnmentor.com/events/Berlin1881.pgn) | Berlin 1881 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Berlin1897.pgn`](https://www.pgnmentor.com/events/Berlin1897.pgn) | Berlin 1897 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Berlin1907.pgn`](https://www.pgnmentor.com/events/Berlin1907.pgn) | Berlin 1907 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Berlin1920a.pgn`](https://www.pgnmentor.com/events/Berlin1920a.pgn) | Berlin 1920 A |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Berlin1920b.pgn`](https://www.pgnmentor.com/events/Berlin1920b.pgn) | Berlin 1920 B |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Berlin1926.pgn`](https://www.pgnmentor.com/events/Berlin1926.pgn) | Berlin 1926 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Berlin1928.pgn`](https://www.pgnmentor.com/events/Berlin1928.pgn) | Berlin 1928 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Berlin2022-GP1.pgn`](https://www.pgnmentor.com/events/Berlin2022-GP1.pgn) | Berlin 2022 Grand Prix 1 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Berlin2022-GP3.pgn`](https://www.pgnmentor.com/events/Berlin2022-GP3.pgn) | Berlin 2022 Grand Prix 3 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bermuda2005.pgn`](https://www.pgnmentor.com/events/Bermuda2005.pgn) | Bermuda 2005 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bern1932.pgn`](https://www.pgnmentor.com/events/Bern1932.pgn) | Bern 1932 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Beverwijk1967.pgn`](https://www.pgnmentor.com/events/Beverwijk1967.pgn) | Beverwijk 1967 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Biel1992.pgn`](https://www.pgnmentor.com/events/Biel1992.pgn) | Biel 1992 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Biel1997.pgn`](https://www.pgnmentor.com/events/Biel1997.pgn) | Biel 1997 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Biel2004.pgn`](https://www.pgnmentor.com/events/Biel2004.pgn) | Biel 2004 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Biel2006.pgn`](https://www.pgnmentor.com/events/Biel2006.pgn) | Biel 2006 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Biel2007.pgn`](https://www.pgnmentor.com/events/Biel2007.pgn) | Biel 2007 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Biel2008.pgn`](https://www.pgnmentor.com/events/Biel2008.pgn) | Biel 2008 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Biel2009.pgn`](https://www.pgnmentor.com/events/Biel2009.pgn) | Biel 2009 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Biel2011.pgn`](https://www.pgnmentor.com/events/Biel2011.pgn) | Biel 2011 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Biel2012.pgn`](https://www.pgnmentor.com/events/Biel2012.pgn) | Biel 2012 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Biel2014.pgn`](https://www.pgnmentor.com/events/Biel2014.pgn) | Biel 2014 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Biel2018.pgn`](https://www.pgnmentor.com/events/Biel2018.pgn) | Biel 2018 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bilbao2008.pgn`](https://www.pgnmentor.com/events/Bilbao2008.pgn) | Bilbao 2008 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bilbao2009.pgn`](https://www.pgnmentor.com/events/Bilbao2009.pgn) | Bilbao 2009 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bilbao2010.pgn`](https://www.pgnmentor.com/events/Bilbao2010.pgn) | Bilbao 2010 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bilbao2011.pgn`](https://www.pgnmentor.com/events/Bilbao2011.pgn) | Bilbao 2011 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bilbao2012.pgn`](https://www.pgnmentor.com/events/Bilbao2012.pgn) | Bilbao 2012 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bilbao2016.pgn`](https://www.pgnmentor.com/events/Bilbao2016.pgn) | Bilbao 2016 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Birmingham1858.pgn`](https://www.pgnmentor.com/events/Birmingham1858.pgn) | Birmingham 1858 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bled1931.pgn`](https://www.pgnmentor.com/events/Bled1931.pgn) | Bled 1931 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bled1961.pgn`](https://www.pgnmentor.com/events/Bled1961.pgn) | Bled 1961 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bled1979.pgn`](https://www.pgnmentor.com/events/Bled1979.pgn) | Bled 1979 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bournemouth1939.pgn`](https://www.pgnmentor.com/events/Bournemouth1939.pgn) | Bournemouth 1939 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bradford1888.pgn`](https://www.pgnmentor.com/events/Bradford1888.pgn) | Bradford 1888 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Breslau1889.pgn`](https://www.pgnmentor.com/events/Breslau1889.pgn) | Breslau 1889 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Breslau1912.pgn`](https://www.pgnmentor.com/events/Breslau1912.pgn) | Breslau 1912 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Breslau1925.pgn`](https://www.pgnmentor.com/events/Breslau1925.pgn) | Breslau 1925 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bristol1861.pgn`](https://www.pgnmentor.com/events/Bristol1861.pgn) | Bristol 1861 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Brussels1986.pgn`](https://www.pgnmentor.com/events/Brussels1986.pgn) | Brussels 1986 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Brussels1987.pgn`](https://www.pgnmentor.com/events/Brussels1987.pgn) | Brussels 1987 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Brussels1988.pgn`](https://www.pgnmentor.com/events/Brussels1988.pgn) | Brussels 1988 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bucharest1953.pgn`](https://www.pgnmentor.com/events/Bucharest1953.pgn) | Bucharest 1953 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bucharest2021.pgn`](https://www.pgnmentor.com/events/Bucharest2021.pgn) | Bucharest 2021 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bucharest2022.pgn`](https://www.pgnmentor.com/events/Bucharest2022.pgn) | Bucharest 2022 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bucharest2023.pgn`](https://www.pgnmentor.com/events/Bucharest2023.pgn) | Bucharest 2023 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Budapest1896.pgn`](https://www.pgnmentor.com/events/Budapest1896.pgn) | Budapest 1896 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Budapest1913.pgn`](https://www.pgnmentor.com/events/Budapest1913.pgn) | Budapest 1913 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Budapest1921.pgn`](https://www.pgnmentor.com/events/Budapest1921.pgn) | Budapest 1921 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Budapest1926.pgn`](https://www.pgnmentor.com/events/Budapest1926.pgn) | Budapest 1926 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Budapest1929.pgn`](https://www.pgnmentor.com/events/Budapest1929.pgn) | Budapest 1929 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Budapest1940.pgn`](https://www.pgnmentor.com/events/Budapest1940.pgn) | Budapest 1940 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Budapest1952.pgn`](https://www.pgnmentor.com/events/Budapest1952.pgn) | Budapest 1952 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Budapest2003.pgn`](https://www.pgnmentor.com/events/Budapest2003.pgn) | Budapest 2003 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Budva1967.pgn`](https://www.pgnmentor.com/events/Budva1967.pgn) | Budva 1967 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/BuenosAires1939a.pgn`](https://www.pgnmentor.com/events/BuenosAires1939a.pgn) | Buenos Aires A 1939 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/BuenosAires1939b.pgn`](https://www.pgnmentor.com/events/BuenosAires1939b.pgn) | Buenos Aires B 1939 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/BuenosAires1941.pgn`](https://www.pgnmentor.com/events/BuenosAires1941.pgn) | Buenos Aires 1941 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/BuenosAires1944.pgn`](https://www.pgnmentor.com/events/BuenosAires1944.pgn) | Buenos Aires 1944 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/BuenosAires1960.pgn`](https://www.pgnmentor.com/events/BuenosAires1960.pgn) | Buenos Aires 1960 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/BuenosAires1970.pgn`](https://www.pgnmentor.com/events/BuenosAires1970.pgn) | Buenos Aires 1970 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/BuenosAires1980.pgn`](https://www.pgnmentor.com/events/BuenosAires1980.pgn) | Buenos Aires 1980 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/BuenosAires1994.pgn`](https://www.pgnmentor.com/events/BuenosAires1994.pgn) | Buenos Aires 1994 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bugojno1978.pgn`](https://www.pgnmentor.com/events/Bugojno1978.pgn) | Bugojno 1978 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bugojno1980.pgn`](https://www.pgnmentor.com/events/Bugojno1980.pgn) | Bugojno 1980 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bugojno1982.pgn`](https://www.pgnmentor.com/events/Bugojno1982.pgn) | Bugojno 1982 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bugojno1984.pgn`](https://www.pgnmentor.com/events/Bugojno1984.pgn) | Bugojno 1984 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Bugojno1986.pgn`](https://www.pgnmentor.com/events/Bugojno1986.pgn) | Bugojno 1986 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Cambridge1860.pgn`](https://www.pgnmentor.com/events/Cambridge1860.pgn) | Cambridge 1860 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Cambridge1904.pgn`](https://www.pgnmentor.com/events/Cambridge1904.pgn) | Cambridge 1904 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates1950.pgn`](https://www.pgnmentor.com/events/Candidates1950.pgn) | Candidates 1950 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates1953.pgn`](https://www.pgnmentor.com/events/Candidates1953.pgn) | Candidates 1953 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates1956.pgn`](https://www.pgnmentor.com/events/Candidates1956.pgn) | Candidates 1956 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates1959.pgn`](https://www.pgnmentor.com/events/Candidates1959.pgn) | Candidates 1959 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates1962.pgn`](https://www.pgnmentor.com/events/Candidates1962.pgn) | Candidates 1962 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates1965.pgn`](https://www.pgnmentor.com/events/Candidates1965.pgn) | Candidates 1965 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates1968.pgn`](https://www.pgnmentor.com/events/Candidates1968.pgn) | Candidates 1968 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates1971.pgn`](https://www.pgnmentor.com/events/Candidates1971.pgn) | Candidates 1971 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates1974.pgn`](https://www.pgnmentor.com/events/Candidates1974.pgn) | Candidates 1974 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates1977.pgn`](https://www.pgnmentor.com/events/Candidates1977.pgn) | Candidates 1977 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates1980.pgn`](https://www.pgnmentor.com/events/Candidates1980.pgn) | Candidates 1980 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates1983.pgn`](https://www.pgnmentor.com/events/Candidates1983.pgn) | Candidates 1983 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates1985.pgn`](https://www.pgnmentor.com/events/Candidates1985.pgn) | Candidates 1985 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates1985r.pgn`](https://www.pgnmentor.com/events/Candidates1985r.pgn) | Cand Reserve 1985 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates1988.pgn`](https://www.pgnmentor.com/events/Candidates1988.pgn) | Candidates 1988 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates1990.pgn`](https://www.pgnmentor.com/events/Candidates1990.pgn) | Candidates 1990 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates1994.pgn`](https://www.pgnmentor.com/events/Candidates1994.pgn) | Candidates 1994 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates2011.pgn`](https://www.pgnmentor.com/events/Candidates2011.pgn) | Candidates 2011 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates2013.pgn`](https://www.pgnmentor.com/events/Candidates2013.pgn) | Candidates 2013 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates2014.pgn`](https://www.pgnmentor.com/events/Candidates2014.pgn) | Candidates 2014 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates2016.pgn`](https://www.pgnmentor.com/events/Candidates2016.pgn) | Candidates 2016 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates2018.pgn`](https://www.pgnmentor.com/events/Candidates2018.pgn) | Candidates 2018 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates2020.pgn`](https://www.pgnmentor.com/events/Candidates2020.pgn) | Candidates 2020 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates2022.pgn`](https://www.pgnmentor.com/events/Candidates2022.pgn) | Candidates 2022 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Candidates2024.pgn`](https://www.pgnmentor.com/events/Candidates2024.pgn) | Candidates 2024 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Cannes2002.pgn`](https://www.pgnmentor.com/events/Cannes2002.pgn) | Cannes 2002 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Carlsbad1907.pgn`](https://www.pgnmentor.com/events/Carlsbad1907.pgn) | Carlsbad 1907 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Carrasco1921.pgn`](https://www.pgnmentor.com/events/Carrasco1921.pgn) | Carrasco 1921 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Carrasco1938.pgn`](https://www.pgnmentor.com/events/Carrasco1938.pgn) | Carrasco 1938 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Chennai2024.pgn`](https://www.pgnmentor.com/events/Chennai2024.pgn) | Chennai 2024 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Chicago1874.pgn`](https://www.pgnmentor.com/events/Chicago1874.pgn) | Chicago 1874 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Chicago1982.pgn`](https://www.pgnmentor.com/events/Chicago1982.pgn) | Chicago 1982 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Cleveland1871.pgn`](https://www.pgnmentor.com/events/Cleveland1871.pgn) | Cleveland 1871 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Coburg1904.pgn`](https://www.pgnmentor.com/events/Coburg1904.pgn) | Coburg 1904 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Cologne1877.pgn`](https://www.pgnmentor.com/events/Cologne1877.pgn) | Cologne 1877 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Cologne1898.pgn`](https://www.pgnmentor.com/events/Cologne1898.pgn) | Cologne 1898 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Copenhagen1907.pgn`](https://www.pgnmentor.com/events/Copenhagen1907.pgn) | Copenhagen 1907 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Copenhagen1916.pgn`](https://www.pgnmentor.com/events/Copenhagen1916.pgn) | Copenhagen 1916 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Copenhagen1924.pgn`](https://www.pgnmentor.com/events/Copenhagen1924.pgn) | Copenhagen 1924 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Copenhagen1934.pgn`](https://www.pgnmentor.com/events/Copenhagen1934.pgn) | Copenhagen 1934 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dallas1957.pgn`](https://www.pgnmentor.com/events/Dallas1957.pgn) | Dallas 1957 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Debrecen1925.pgn`](https://www.pgnmentor.com/events/Debrecen1925.pgn) | Debrecen 1925 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Donostia2009.pgn`](https://www.pgnmentor.com/events/Donostia2009.pgn) | Donostia 2009 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1928.pgn`](https://www.pgnmentor.com/events/Dortmund1928.pgn) | Dortmund 1928 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1973.pgn`](https://www.pgnmentor.com/events/Dortmund1973.pgn) | Dortmund 1973 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1975.pgn`](https://www.pgnmentor.com/events/Dortmund1975.pgn) | Dortmund 1975 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1976.pgn`](https://www.pgnmentor.com/events/Dortmund1976.pgn) | Dortmund 1976 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1977.pgn`](https://www.pgnmentor.com/events/Dortmund1977.pgn) | Dortmund 1977 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1978.pgn`](https://www.pgnmentor.com/events/Dortmund1978.pgn) | Dortmund 1978 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1979.pgn`](https://www.pgnmentor.com/events/Dortmund1979.pgn) | Dortmund 1979 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1980.pgn`](https://www.pgnmentor.com/events/Dortmund1980.pgn) | Dortmund 1980 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1981.pgn`](https://www.pgnmentor.com/events/Dortmund1981.pgn) | Dortmund 1981 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1982.pgn`](https://www.pgnmentor.com/events/Dortmund1982.pgn) | Dortmund 1982 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1983.pgn`](https://www.pgnmentor.com/events/Dortmund1983.pgn) | Dortmund 1983 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1984.pgn`](https://www.pgnmentor.com/events/Dortmund1984.pgn) | Dortmund 1984 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1985.pgn`](https://www.pgnmentor.com/events/Dortmund1985.pgn) | Dortmund 1985 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1986.pgn`](https://www.pgnmentor.com/events/Dortmund1986.pgn) | Dortmund 1986 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1987.pgn`](https://www.pgnmentor.com/events/Dortmund1987.pgn) | Dortmund 1987 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1988.pgn`](https://www.pgnmentor.com/events/Dortmund1988.pgn) | Dortmund 1988 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1989.pgn`](https://www.pgnmentor.com/events/Dortmund1989.pgn) | Dortmund 1989 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1990.pgn`](https://www.pgnmentor.com/events/Dortmund1990.pgn) | Dortmund 1990 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1991.pgn`](https://www.pgnmentor.com/events/Dortmund1991.pgn) | Dortmund 1991 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1992.pgn`](https://www.pgnmentor.com/events/Dortmund1992.pgn) | Dortmund 1992 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1993.pgn`](https://www.pgnmentor.com/events/Dortmund1993.pgn) | Dortmund 1993 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1994.pgn`](https://www.pgnmentor.com/events/Dortmund1994.pgn) | Dortmund 1994 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1995.pgn`](https://www.pgnmentor.com/events/Dortmund1995.pgn) | Dortmund 1995 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1996.pgn`](https://www.pgnmentor.com/events/Dortmund1996.pgn) | Dortmund 1996 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1997.pgn`](https://www.pgnmentor.com/events/Dortmund1997.pgn) | Dortmund 1997 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1998.pgn`](https://www.pgnmentor.com/events/Dortmund1998.pgn) | Dortmund 1998 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund1999.pgn`](https://www.pgnmentor.com/events/Dortmund1999.pgn) | Dortmund 1999 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund2000.pgn`](https://www.pgnmentor.com/events/Dortmund2000.pgn) | Dortmund 2000 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund2001.pgn`](https://www.pgnmentor.com/events/Dortmund2001.pgn) | Dortmund 2001 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund2002.pgn`](https://www.pgnmentor.com/events/Dortmund2002.pgn) | Dortmund 2002 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund2003.pgn`](https://www.pgnmentor.com/events/Dortmund2003.pgn) | Dortmund 2003 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund2004.pgn`](https://www.pgnmentor.com/events/Dortmund2004.pgn) | Dortmund 2004 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund2005.pgn`](https://www.pgnmentor.com/events/Dortmund2005.pgn) | Dortmund 2005 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund2006.pgn`](https://www.pgnmentor.com/events/Dortmund2006.pgn) | Dortmund 2006 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund2007.pgn`](https://www.pgnmentor.com/events/Dortmund2007.pgn) | Dortmund 2007 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund2008.pgn`](https://www.pgnmentor.com/events/Dortmund2008.pgn) | Dortmund 2008 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund2009.pgn`](https://www.pgnmentor.com/events/Dortmund2009.pgn) | Dortmund 2009 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund2010.pgn`](https://www.pgnmentor.com/events/Dortmund2010.pgn) | Dortmund 2010 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund2011.pgn`](https://www.pgnmentor.com/events/Dortmund2011.pgn) | Dortmund 2011 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund2012.pgn`](https://www.pgnmentor.com/events/Dortmund2012.pgn) | Dortmund 2012 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund2014.pgn`](https://www.pgnmentor.com/events/Dortmund2014.pgn) | Dortmund 2014 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund2015.pgn`](https://www.pgnmentor.com/events/Dortmund2015.pgn) | Dortmund 2015 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dortmund2019.pgn`](https://www.pgnmentor.com/events/Dortmund2019.pgn) | Dortmund 2019 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/DosHermanas1991.pgn`](https://www.pgnmentor.com/events/DosHermanas1991.pgn) | Dos Hermanas 1991 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/DosHermanas1992.pgn`](https://www.pgnmentor.com/events/DosHermanas1992.pgn) | Dos Hermanas 1992 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/DosHermanas1993.pgn`](https://www.pgnmentor.com/events/DosHermanas1993.pgn) | Dos Hermanas 1993 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/DosHermanas1994.pgn`](https://www.pgnmentor.com/events/DosHermanas1994.pgn) | Dos Hermanas 1994 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/DosHermanas1995.pgn`](https://www.pgnmentor.com/events/DosHermanas1995.pgn) | Dos Hermanas 1995 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/DosHermanas1996.pgn`](https://www.pgnmentor.com/events/DosHermanas1996.pgn) | Dos Hermanas 1996 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/DosHermanas1997.pgn`](https://www.pgnmentor.com/events/DosHermanas1997.pgn) | Dos Hermanas 1997 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/DosHermanas1999.pgn`](https://www.pgnmentor.com/events/DosHermanas1999.pgn) | Dos Hermanas 1999 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/DosHermanas2001.pgn`](https://www.pgnmentor.com/events/DosHermanas2001.pgn) | Dos Hermanas 2001 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/DosHermanas2003.pgn`](https://www.pgnmentor.com/events/DosHermanas2003.pgn) | Dos Hermanas 2003 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/DosHermanas2005.pgn`](https://www.pgnmentor.com/events/DosHermanas2005.pgn) | Dos Hermanas 2005 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dresden1892.pgn`](https://www.pgnmentor.com/events/Dresden1892.pgn) | Dresden 1892 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dresden1926.pgn`](https://www.pgnmentor.com/events/Dresden1926.pgn) | Dresden 1926 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dresden1936.pgn`](https://www.pgnmentor.com/events/Dresden1936.pgn) | Dresden 1936 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Duisburg1929.pgn`](https://www.pgnmentor.com/events/Duisburg1929.pgn) | Duisburg 1929 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dundee1867.pgn`](https://www.pgnmentor.com/events/Dundee1867.pgn) | Dundee 1867 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dusseldorf1862.pgn`](https://www.pgnmentor.com/events/Dusseldorf1862.pgn) | Dusseldorf 1862 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dusseldorf1908.pgn`](https://www.pgnmentor.com/events/Dusseldorf1908.pgn) | Dusseldorf 1908 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Dusseldorf2023.pgn`](https://www.pgnmentor.com/events/Dusseldorf2023.pgn) | Dusseldorf 2023 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Elista2008.pgn`](https://www.pgnmentor.com/events/Elista2008.pgn) | Elista 2008 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Enghien2003.pgn`](https://www.pgnmentor.com/events/Enghien2003.pgn) | Enghien 2003 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/FideChamp1993.pgn`](https://www.pgnmentor.com/events/FideChamp1993.pgn) | FIDE Championship 1993 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/FideChamp1996.pgn`](https://www.pgnmentor.com/events/FideChamp1996.pgn) | FIDE Championship 1996 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/FideChamp1998.pgn`](https://www.pgnmentor.com/events/FideChamp1998.pgn) | FIDE Championship 1998 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/FideChamp1999.pgn`](https://www.pgnmentor.com/events/FideChamp1999.pgn) | FIDE Championship 1999 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/FideChamp2000.pgn`](https://www.pgnmentor.com/events/FideChamp2000.pgn) | FIDE Championship 2000 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/FideChamp2002.pgn`](https://www.pgnmentor.com/events/FideChamp2002.pgn) | FIDE Championship 2002 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/FideChamp2004.pgn`](https://www.pgnmentor.com/events/FideChamp2004.pgn) | FIDE Championship 2004 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/FideChamp2005.pgn`](https://www.pgnmentor.com/events/FideChamp2005.pgn) | FIDE Championship 2005 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Foros2006.pgn`](https://www.pgnmentor.com/events/Foros2006.pgn) | Foros 2006 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Foros2007.pgn`](https://www.pgnmentor.com/events/Foros2007.pgn) | Foros 2007 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Foros2008.pgn`](https://www.pgnmentor.com/events/Foros2008.pgn) | Foros 2008 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Frankfurt1878.pgn`](https://www.pgnmentor.com/events/Frankfurt1878.pgn) | Frankfurt 1878 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Frankfurt1887.pgn`](https://www.pgnmentor.com/events/Frankfurt1887.pgn) | Frankfurt 1887 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Frankfurt1923.pgn`](https://www.pgnmentor.com/events/Frankfurt1923.pgn) | Frankfurt 1923 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Frankfurt1930.pgn`](https://www.pgnmentor.com/events/Frankfurt1930.pgn) | Frankfurt 1930 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Geneva1977.pgn`](https://www.pgnmentor.com/events/Geneva1977.pgn) | Geneva 1977 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Geneva2017.pgn`](https://www.pgnmentor.com/events/Geneva2017.pgn) | Geneva 2017 GP |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Gibraltar2019.pgn`](https://www.pgnmentor.com/events/Gibraltar2019.pgn) | Gibraltar 2019 GP |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Giessen1928.pgn`](https://www.pgnmentor.com/events/Giessen1928.pgn) | Giessen 1928 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Gijon1944.pgn`](https://www.pgnmentor.com/events/Gijon1944.pgn) | Gijon 1944 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Gijon1945.pgn`](https://www.pgnmentor.com/events/Gijon1945.pgn) | Gijon 1945 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Gjovik1983.pgn`](https://www.pgnmentor.com/events/Gjovik1983.pgn) | Gjovik 1983 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Gothenburg1909.pgn`](https://www.pgnmentor.com/events/Gothenburg1909.pgn) | Gothenburg 1909 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Gothenburg1920.pgn`](https://www.pgnmentor.com/events/Gothenburg1920.pgn) | Gothenburg 1920 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Groningen1946.pgn`](https://www.pgnmentor.com/events/Groningen1946.pgn) | Groningen 1946 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hague1921.pgn`](https://www.pgnmentor.com/events/Hague1921.pgn) | Hague 1921 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hague1928.pgn`](https://www.pgnmentor.com/events/Hague1928.pgn) | Hague 1928 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hamburg1868.pgn`](https://www.pgnmentor.com/events/Hamburg1868.pgn) | Hamburg 1868 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hamburg1885.pgn`](https://www.pgnmentor.com/events/Hamburg1885.pgn) | Hamburg 1885 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hamburg1910.pgn`](https://www.pgnmentor.com/events/Hamburg1910.pgn) | Hamburg 1910 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hamburg1921.pgn`](https://www.pgnmentor.com/events/Hamburg1921.pgn) | Hamburg 1921 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hamilton1941.pgn`](https://www.pgnmentor.com/events/Hamilton1941.pgn) | Hamilton 1941 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hannover1902.pgn`](https://www.pgnmentor.com/events/Hannover1902.pgn) | Hannover 1902 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1895.pgn`](https://www.pgnmentor.com/events/Hastings1895.pgn) | Hastings 1895 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1919.pgn`](https://www.pgnmentor.com/events/Hastings1919.pgn) | Hastings 1919 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1922.pgn`](https://www.pgnmentor.com/events/Hastings1922.pgn) | Hastings 1922 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1923.pgn`](https://www.pgnmentor.com/events/Hastings1923.pgn) | Hastings 1923 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1925.pgn`](https://www.pgnmentor.com/events/Hastings1925.pgn) | Hastings 1925 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1926.pgn`](https://www.pgnmentor.com/events/Hastings1926.pgn) | Hastings 1926 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1927.pgn`](https://www.pgnmentor.com/events/Hastings1927.pgn) | Hastings 1927 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1929.pgn`](https://www.pgnmentor.com/events/Hastings1929.pgn) | Hastings 1929 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1930.pgn`](https://www.pgnmentor.com/events/Hastings1930.pgn) | Hastings 1930 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1931.pgn`](https://www.pgnmentor.com/events/Hastings1931.pgn) | Hastings 1931 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1932.pgn`](https://www.pgnmentor.com/events/Hastings1932.pgn) | Hastings 1932 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1933.pgn`](https://www.pgnmentor.com/events/Hastings1933.pgn) | Hastings 1933 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1934.pgn`](https://www.pgnmentor.com/events/Hastings1934.pgn) | Hastings 1934 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1935.pgn`](https://www.pgnmentor.com/events/Hastings1935.pgn) | Hastings 1935 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1936.pgn`](https://www.pgnmentor.com/events/Hastings1936.pgn) | Hastings 1936 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1937.pgn`](https://www.pgnmentor.com/events/Hastings1937.pgn) | Hastings 1937 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1938.pgn`](https://www.pgnmentor.com/events/Hastings1938.pgn) | Hastings 1938 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1945.pgn`](https://www.pgnmentor.com/events/Hastings1945.pgn) | Hastings 1945 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1946.pgn`](https://www.pgnmentor.com/events/Hastings1946.pgn) | Hastings 1946 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1948.pgn`](https://www.pgnmentor.com/events/Hastings1948.pgn) | Hastings 1948 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1949.pgn`](https://www.pgnmentor.com/events/Hastings1949.pgn) | Hastings 1949 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1950.pgn`](https://www.pgnmentor.com/events/Hastings1950.pgn) | Hastings 1950 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1951.pgn`](https://www.pgnmentor.com/events/Hastings1951.pgn) | Hastings 1951 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1953.pgn`](https://www.pgnmentor.com/events/Hastings1953.pgn) | Hastings 1953 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1954.pgn`](https://www.pgnmentor.com/events/Hastings1954.pgn) | Hastings 1954 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1955.pgn`](https://www.pgnmentor.com/events/Hastings1955.pgn) | Hastings 1955 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1956.pgn`](https://www.pgnmentor.com/events/Hastings1956.pgn) | Hastings 1956 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1957.pgn`](https://www.pgnmentor.com/events/Hastings1957.pgn) | Hastings 1957 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1959.pgn`](https://www.pgnmentor.com/events/Hastings1959.pgn) | Hastings 1959 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1960.pgn`](https://www.pgnmentor.com/events/Hastings1960.pgn) | Hastings 1960 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1961.pgn`](https://www.pgnmentor.com/events/Hastings1961.pgn) | Hastings 1961 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1962.pgn`](https://www.pgnmentor.com/events/Hastings1962.pgn) | Hastings 1962 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1963.pgn`](https://www.pgnmentor.com/events/Hastings1963.pgn) | Hastings 1963 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1964.pgn`](https://www.pgnmentor.com/events/Hastings1964.pgn) | Hastings 1964 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1965.pgn`](https://www.pgnmentor.com/events/Hastings1965.pgn) | Hastings 1965 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1966.pgn`](https://www.pgnmentor.com/events/Hastings1966.pgn) | Hastings 1966 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1967.pgn`](https://www.pgnmentor.com/events/Hastings1967.pgn) | Hastings 1967 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1968.pgn`](https://www.pgnmentor.com/events/Hastings1968.pgn) | Hastings 1968 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1969.pgn`](https://www.pgnmentor.com/events/Hastings1969.pgn) | Hastings 1969 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1970.pgn`](https://www.pgnmentor.com/events/Hastings1970.pgn) | Hastings 1970 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1971.pgn`](https://www.pgnmentor.com/events/Hastings1971.pgn) | Hastings 1971 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1972.pgn`](https://www.pgnmentor.com/events/Hastings1972.pgn) | Hastings 1972 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1973.pgn`](https://www.pgnmentor.com/events/Hastings1973.pgn) | Hastings 1973 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1974.pgn`](https://www.pgnmentor.com/events/Hastings1974.pgn) | Hastings 1974 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1975.pgn`](https://www.pgnmentor.com/events/Hastings1975.pgn) | Hastings 1975 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1976.pgn`](https://www.pgnmentor.com/events/Hastings1976.pgn) | Hastings 1976 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1977.pgn`](https://www.pgnmentor.com/events/Hastings1977.pgn) | Hastings 1977 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1978.pgn`](https://www.pgnmentor.com/events/Hastings1978.pgn) | Hastings 1978 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1979.pgn`](https://www.pgnmentor.com/events/Hastings1979.pgn) | Hastings 1979 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1980.pgn`](https://www.pgnmentor.com/events/Hastings1980.pgn) | Hastings 1980 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1981.pgn`](https://www.pgnmentor.com/events/Hastings1981.pgn) | Hastings 1981 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1982.pgn`](https://www.pgnmentor.com/events/Hastings1982.pgn) | Hastings 1982 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1983.pgn`](https://www.pgnmentor.com/events/Hastings1983.pgn) | Hastings 1983 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1984.pgn`](https://www.pgnmentor.com/events/Hastings1984.pgn) | Hastings 1984 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1985.pgn`](https://www.pgnmentor.com/events/Hastings1985.pgn) | Hastings 1985 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1986.pgn`](https://www.pgnmentor.com/events/Hastings1986.pgn) | Hastings 1986 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1987.pgn`](https://www.pgnmentor.com/events/Hastings1987.pgn) | Hastings 1987 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1988.pgn`](https://www.pgnmentor.com/events/Hastings1988.pgn) | Hastings 1988 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1989.pgn`](https://www.pgnmentor.com/events/Hastings1989.pgn) | Hastings 1989 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1990.pgn`](https://www.pgnmentor.com/events/Hastings1990.pgn) | Hastings 1990 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1991.pgn`](https://www.pgnmentor.com/events/Hastings1991.pgn) | Hastings 1991 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1992.pgn`](https://www.pgnmentor.com/events/Hastings1992.pgn) | Hastings 1992 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1993.pgn`](https://www.pgnmentor.com/events/Hastings1993.pgn) | Hastings 1993 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1994.pgn`](https://www.pgnmentor.com/events/Hastings1994.pgn) | Hastings 1994 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1995.pgn`](https://www.pgnmentor.com/events/Hastings1995.pgn) | Hastings 1995 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1996.pgn`](https://www.pgnmentor.com/events/Hastings1996.pgn) | Hastings 1996 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1997.pgn`](https://www.pgnmentor.com/events/Hastings1997.pgn) | Hastings 1997 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1998.pgn`](https://www.pgnmentor.com/events/Hastings1998.pgn) | Hastings 1998 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings1999.pgn`](https://www.pgnmentor.com/events/Hastings1999.pgn) | Hastings 1999 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings2000.pgn`](https://www.pgnmentor.com/events/Hastings2000.pgn) | Hastings 2000 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings2001.pgn`](https://www.pgnmentor.com/events/Hastings2001.pgn) | Hastings 2001 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings2002.pgn`](https://www.pgnmentor.com/events/Hastings2002.pgn) | Hastings 2002 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings2003.pgn`](https://www.pgnmentor.com/events/Hastings2003.pgn) | Hastings 2003 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hastings2004.pgn`](https://www.pgnmentor.com/events/Hastings2004.pgn) | Hastings 2004 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Havana1913.pgn`](https://www.pgnmentor.com/events/Havana1913.pgn) | Havana 1913 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Havana1962.pgn`](https://www.pgnmentor.com/events/Havana1962.pgn) | Havana 1962 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Havana1963.pgn`](https://www.pgnmentor.com/events/Havana1963.pgn) | Havana 1963 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Havana1965.pgn`](https://www.pgnmentor.com/events/Havana1965.pgn) | Havana 1965 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Havana2010.pgn`](https://www.pgnmentor.com/events/Havana2010.pgn) | Havana 2010 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Heidelberg1949.pgn`](https://www.pgnmentor.com/events/Heidelberg1949.pgn) | Heidelberg 1949 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hilversum1973.pgn`](https://www.pgnmentor.com/events/Hilversum1973.pgn) | Hilversum 1973 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hollywood1945.pgn`](https://www.pgnmentor.com/events/Hollywood1945.pgn) | Hollywood 1945 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Homburg1927.pgn`](https://www.pgnmentor.com/events/Homburg1927.pgn) | Homburg 1927 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hoogeveen2003.pgn`](https://www.pgnmentor.com/events/Hoogeveen2003.pgn) | Hoogeveen 2003 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Hoogeveen2006.pgn`](https://www.pgnmentor.com/events/Hoogeveen2006.pgn) | Hoogeveen 2006 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1948.pgn`](https://www.pgnmentor.com/events/Interzonal1948.pgn) | Interzonal 1948 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1952.pgn`](https://www.pgnmentor.com/events/Interzonal1952.pgn) | Interzonal 1952 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1955.pgn`](https://www.pgnmentor.com/events/Interzonal1955.pgn) | Interzonal 1955 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1958.pgn`](https://www.pgnmentor.com/events/Interzonal1958.pgn) | Interzonal 1958 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1962.pgn`](https://www.pgnmentor.com/events/Interzonal1962.pgn) | Interzonal 1962 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1964.pgn`](https://www.pgnmentor.com/events/Interzonal1964.pgn) | Interzonal 1964 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1967.pgn`](https://www.pgnmentor.com/events/Interzonal1967.pgn) | Interzonal 1967 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1970.pgn`](https://www.pgnmentor.com/events/Interzonal1970.pgn) | Interzonal 1970 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1973a.pgn`](https://www.pgnmentor.com/events/Interzonal1973a.pgn) | Interzonal A 1973 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1973b.pgn`](https://www.pgnmentor.com/events/Interzonal1973b.pgn) | Interzonal B 1973 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1976a.pgn`](https://www.pgnmentor.com/events/Interzonal1976a.pgn) | Interzonal A 1976 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1976b.pgn`](https://www.pgnmentor.com/events/Interzonal1976b.pgn) | Interzonal B 1976 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1979a.pgn`](https://www.pgnmentor.com/events/Interzonal1979a.pgn) | Interzonal A 1979 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1979b.pgn`](https://www.pgnmentor.com/events/Interzonal1979b.pgn) | Interzonal B 1979 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1982a.pgn`](https://www.pgnmentor.com/events/Interzonal1982a.pgn) | Interzonal A 1982 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1982b.pgn`](https://www.pgnmentor.com/events/Interzonal1982b.pgn) | Interzonal B 1982 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1982c.pgn`](https://www.pgnmentor.com/events/Interzonal1982c.pgn) | Interzonal C 1982 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1985a.pgn`](https://www.pgnmentor.com/events/Interzonal1985a.pgn) | Interzonal A 1985 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1985b.pgn`](https://www.pgnmentor.com/events/Interzonal1985b.pgn) | Interzonal B 1985 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1985c.pgn`](https://www.pgnmentor.com/events/Interzonal1985c.pgn) | Interzonal C 1985 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1987a.pgn`](https://www.pgnmentor.com/events/Interzonal1987a.pgn) | Interzonal A 1987 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1987b.pgn`](https://www.pgnmentor.com/events/Interzonal1987b.pgn) | Interzonal B 1987 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1987c.pgn`](https://www.pgnmentor.com/events/Interzonal1987c.pgn) | Interzonal C 1987 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1990.pgn`](https://www.pgnmentor.com/events/Interzonal1990.pgn) | Interzonal 1990 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Interzonal1993.pgn`](https://www.pgnmentor.com/events/Interzonal1993.pgn) | Interzonal 1993 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Jermuk2009.pgn`](https://www.pgnmentor.com/events/Jermuk2009.pgn) | Jermuk 2009 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Johannesburg1979.pgn`](https://www.pgnmentor.com/events/Johannesburg1979.pgn) | Johannesburg 1979 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Johannesburg1981.pgn`](https://www.pgnmentor.com/events/Johannesburg1981.pgn) | Johannesburg 1981 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Karlovy1948.pgn`](https://www.pgnmentor.com/events/Karlovy1948.pgn) | Karlovy 1948 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Karlsbad1911.pgn`](https://www.pgnmentor.com/events/Karlsbad1911.pgn) | Karlsbad 1911 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Karlsbad1923.pgn`](https://www.pgnmentor.com/events/Karlsbad1923.pgn) | Karlsbad 1923 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Karlsbad1929.pgn`](https://www.pgnmentor.com/events/Karlsbad1929.pgn) | Karlsbad 1929 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Kecskemet1927.pgn`](https://www.pgnmentor.com/events/Kecskemet1927.pgn) | Kecskemet 1927 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Kemeri1937.pgn`](https://www.pgnmentor.com/events/Kemeri1937.pgn) | Kemeri 1937 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Kemeri1939.pgn`](https://www.pgnmentor.com/events/Kemeri1939.pgn) | Kemeri 1939 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/KhantyMansiysk2015.pgn`](https://www.pgnmentor.com/events/KhantyMansiysk2015.pgn) | Khanty-Mansiysk GP 2015 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Kiel1893.pgn`](https://www.pgnmentor.com/events/Kiel1893.pgn) | Kiel 1893 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Kiev1903.pgn`](https://www.pgnmentor.com/events/Kiev1903.pgn) | Kiev 1903 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Kosice1918.pgn`](https://www.pgnmentor.com/events/Kosice1918.pgn) | Kosice 1918 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Krakow1940.pgn`](https://www.pgnmentor.com/events/Krakow1940.pgn) | Krakow 1940 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Krakow1941.pgn`](https://www.pgnmentor.com/events/Krakow1941.pgn) | Krakow 1941 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Krefeld1871.pgn`](https://www.pgnmentor.com/events/Krefeld1871.pgn) | Krefeld 1871 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Kuibyshev1942.pgn`](https://www.pgnmentor.com/events/Kuibyshev1942.pgn) | Kuibyshev 1942 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/LakeHopatcong1926.pgn`](https://www.pgnmentor.com/events/LakeHopatcong1926.pgn) | Lake Hopatcong 1926 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/LasPalmas1972.pgn`](https://www.pgnmentor.com/events/LasPalmas1972.pgn) | Las Palmas 1972 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/LasPalmas1973.pgn`](https://www.pgnmentor.com/events/LasPalmas1973.pgn) | Las Palmas 1973 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/LasPalmas1974.pgn`](https://www.pgnmentor.com/events/LasPalmas1974.pgn) | Las Palmas 1974 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/LasPalmas1975.pgn`](https://www.pgnmentor.com/events/LasPalmas1975.pgn) | Las Palmas 1975 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/LasPalmas1976.pgn`](https://www.pgnmentor.com/events/LasPalmas1976.pgn) | Las Palmas 1976 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/LasPalmas1977.pgn`](https://www.pgnmentor.com/events/LasPalmas1977.pgn) | Las Palmas 1977 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/LasPalmas1978.pgn`](https://www.pgnmentor.com/events/LasPalmas1978.pgn) | Las Palmas 1978 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/LasPalmas1980.pgn`](https://www.pgnmentor.com/events/LasPalmas1980.pgn) | Las Palmas 1980 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/LasPalmas1981.pgn`](https://www.pgnmentor.com/events/LasPalmas1981.pgn) | Las Palmas 1981 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/LasPalmas1982.pgn`](https://www.pgnmentor.com/events/LasPalmas1982.pgn) | Las Palmas 1982 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/LasPalmas1991.pgn`](https://www.pgnmentor.com/events/LasPalmas1991.pgn) | Las Palmas 1991 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/LasPalmas1993.pgn`](https://www.pgnmentor.com/events/LasPalmas1993.pgn) | Las Palmas 1993 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/LasPalmas1994.pgn`](https://www.pgnmentor.com/events/LasPalmas1994.pgn) | Las Palmas 1994 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/LasPalmas1996.pgn`](https://www.pgnmentor.com/events/LasPalmas1996.pgn) | Las Palmas 1996 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Leiden1970.pgn`](https://www.pgnmentor.com/events/Leiden1970.pgn) | Leiden 1970 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Leipzig1876.pgn`](https://www.pgnmentor.com/events/Leipzig1876.pgn) | Leipzig 1876 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Leipzig1877.pgn`](https://www.pgnmentor.com/events/Leipzig1877.pgn) | Leipzig 1877 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Leipzig1879.pgn`](https://www.pgnmentor.com/events/Leipzig1879.pgn) | Leipzig 1879 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Leipzig1894.pgn`](https://www.pgnmentor.com/events/Leipzig1894.pgn) | Leipzig 1894 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Leningrad1934.pgn`](https://www.pgnmentor.com/events/Leningrad1934.pgn) | Leningrad 1934 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Leningrad1937.pgn`](https://www.pgnmentor.com/events/Leningrad1937.pgn) | Leningrad 1937 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Leningrad1939.pgn`](https://www.pgnmentor.com/events/Leningrad1939.pgn) | Leningrad 1939 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Leningrad1977.pgn`](https://www.pgnmentor.com/events/Leningrad1977.pgn) | Leningrad 1977 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Leon1996.pgn`](https://www.pgnmentor.com/events/Leon1996.pgn) | Leon 1996 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Liege1930.pgn`](https://www.pgnmentor.com/events/Liege1930.pgn) | Liege 1930 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares1981.pgn`](https://www.pgnmentor.com/events/Linares1981.pgn) | Linares 1981 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares1983.pgn`](https://www.pgnmentor.com/events/Linares1983.pgn) | Linares 1983 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares1985.pgn`](https://www.pgnmentor.com/events/Linares1985.pgn) | Linares 1985 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares1988.pgn`](https://www.pgnmentor.com/events/Linares1988.pgn) | Linares 1988 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares1989.pgn`](https://www.pgnmentor.com/events/Linares1989.pgn) | Linares 1989 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares1990.pgn`](https://www.pgnmentor.com/events/Linares1990.pgn) | Linares 1990 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares1991.pgn`](https://www.pgnmentor.com/events/Linares1991.pgn) | Linares 1991 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares1992.pgn`](https://www.pgnmentor.com/events/Linares1992.pgn) | Linares 1992 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares1993.pgn`](https://www.pgnmentor.com/events/Linares1993.pgn) | Linares 1993 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares1994.pgn`](https://www.pgnmentor.com/events/Linares1994.pgn) | Linares 1994 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares1995.pgn`](https://www.pgnmentor.com/events/Linares1995.pgn) | Linares 1995 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares1997.pgn`](https://www.pgnmentor.com/events/Linares1997.pgn) | Linares 1997 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares1998.pgn`](https://www.pgnmentor.com/events/Linares1998.pgn) | Linares 1998 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares1999.pgn`](https://www.pgnmentor.com/events/Linares1999.pgn) | Linares 1999 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares2000.pgn`](https://www.pgnmentor.com/events/Linares2000.pgn) | Linares 2000 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares2001.pgn`](https://www.pgnmentor.com/events/Linares2001.pgn) | Linares 2001 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares2002.pgn`](https://www.pgnmentor.com/events/Linares2002.pgn) | Linares 2002 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares2003.pgn`](https://www.pgnmentor.com/events/Linares2003.pgn) | Linares 2003 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares2004.pgn`](https://www.pgnmentor.com/events/Linares2004.pgn) | Linares 2004 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares2005.pgn`](https://www.pgnmentor.com/events/Linares2005.pgn) | Linares 2005 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares2006.pgn`](https://www.pgnmentor.com/events/Linares2006.pgn) | Linares 2006 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares2007.pgn`](https://www.pgnmentor.com/events/Linares2007.pgn) | Linares 2007 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares2008.pgn`](https://www.pgnmentor.com/events/Linares2008.pgn) | Linares 2008 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares2009.pgn`](https://www.pgnmentor.com/events/Linares2009.pgn) | Linares 2009 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Linares2010.pgn`](https://www.pgnmentor.com/events/Linares2010.pgn) | Linares 2010 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Ljubljana1938.pgn`](https://www.pgnmentor.com/events/Ljubljana1938.pgn) | Ljubljana 1938 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Ljubojevic1975.pgn`](https://www.pgnmentor.com/events/Ljubojevic1975.pgn) | Ljubojevic 1975 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Ljubojevic1977.pgn`](https://www.pgnmentor.com/events/Ljubojevic1977.pgn) | Ljubojevic 1977 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Lodz1907.pgn`](https://www.pgnmentor.com/events/Lodz1907.pgn) | Lodz 1907 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Lodz1935.pgn`](https://www.pgnmentor.com/events/Lodz1935.pgn) | Lodz 1935 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Lodz1938.pgn`](https://www.pgnmentor.com/events/Lodz1938.pgn) | Lodz 1938 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/London1851.pgn`](https://www.pgnmentor.com/events/London1851.pgn) | London 1851 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/London1862.pgn`](https://www.pgnmentor.com/events/London1862.pgn) | London 1862 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/London1866.pgn`](https://www.pgnmentor.com/events/London1866.pgn) | London 1866 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/London1872.pgn`](https://www.pgnmentor.com/events/London1872.pgn) | London 1872 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/London1876.pgn`](https://www.pgnmentor.com/events/London1876.pgn) | London 1876 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/London1877.pgn`](https://www.pgnmentor.com/events/London1877.pgn) | London 1877 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/London1883.pgn`](https://www.pgnmentor.com/events/London1883.pgn) | London 1883 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/London1892.pgn`](https://www.pgnmentor.com/events/London1892.pgn) | London 1892 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/London1899.pgn`](https://www.pgnmentor.com/events/London1899.pgn) | London 1899 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/London1900.pgn`](https://www.pgnmentor.com/events/London1900.pgn) | London 1900 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/London1922.pgn`](https://www.pgnmentor.com/events/London1922.pgn) | London 1922 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/London1927.pgn`](https://www.pgnmentor.com/events/London1927.pgn) | London 1927 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/London1932.pgn`](https://www.pgnmentor.com/events/London1932.pgn) | London 1932 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/London1946.pgn`](https://www.pgnmentor.com/events/London1946.pgn) | London 1946 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/London1980.pgn`](https://www.pgnmentor.com/events/London1980.pgn) | London 1980 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/London1982.pgn`](https://www.pgnmentor.com/events/London1982.pgn) | London 1982 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/London1984.pgn`](https://www.pgnmentor.com/events/London1984.pgn) | London 1984 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/London1986.pgn`](https://www.pgnmentor.com/events/London1986.pgn) | London 1986 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/London2009.pgn`](https://www.pgnmentor.com/events/London2009.pgn) | London 2009 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/London2012.pgn`](https://www.pgnmentor.com/events/London2012.pgn) | London GP 2012 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/London2015.pgn`](https://www.pgnmentor.com/events/London2015.pgn) | London 2015 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/London2016.pgn`](https://www.pgnmentor.com/events/London2016.pgn) | London 2016 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/London2018.pgn`](https://www.pgnmentor.com/events/London2018.pgn) | London 2018 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/LosAngeles1963.pgn`](https://www.pgnmentor.com/events/LosAngeles1963.pgn) | Los Angeles 1963 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Lugano1970.pgn`](https://www.pgnmentor.com/events/Lugano1970.pgn) | Lugano 1970 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Lviv2000.pgn`](https://www.pgnmentor.com/events/Lviv2000.pgn) | Lviv 2000 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Madrid1943.pgn`](https://www.pgnmentor.com/events/Madrid1943.pgn) | Madrid 1943 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Madrid1996.pgn`](https://www.pgnmentor.com/events/Madrid1996.pgn) | Madrid 1996 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Madrid1997.pgn`](https://www.pgnmentor.com/events/Madrid1997.pgn) | Madrid 1997 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Madrid1998.pgn`](https://www.pgnmentor.com/events/Madrid1998.pgn) | Madrid 1998 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Maehrisch1923.pgn`](https://www.pgnmentor.com/events/Maehrisch1923.pgn) | Maehrisch 1923 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Magdeburg1927.pgn`](https://www.pgnmentor.com/events/Magdeburg1927.pgn) | Magdeburg 1927 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Manchester1857.pgn`](https://www.pgnmentor.com/events/Manchester1857.pgn) | Manchester 1857 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Manchester1890.pgn`](https://www.pgnmentor.com/events/Manchester1890.pgn) | Manchester 1890 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Manila1974.pgn`](https://www.pgnmentor.com/events/Manila1974.pgn) | Manila 1974 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Manila1975.pgn`](https://www.pgnmentor.com/events/Manila1975.pgn) | Manila 1975 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Mannheim1914.pgn`](https://www.pgnmentor.com/events/Mannheim1914.pgn) | Mannheim 1914 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1928.pgn`](https://www.pgnmentor.com/events/MardelPlata1928.pgn) | Mar del Plata 1928 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1934.pgn`](https://www.pgnmentor.com/events/MardelPlata1934.pgn) | Mar del Plata 1934 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1936.pgn`](https://www.pgnmentor.com/events/MardelPlata1936.pgn) | Mar del Plata 1936 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1941.pgn`](https://www.pgnmentor.com/events/MardelPlata1941.pgn) | Mar del Plata 1941 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1942.pgn`](https://www.pgnmentor.com/events/MardelPlata1942.pgn) | Mar del Plata 1942 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1943.pgn`](https://www.pgnmentor.com/events/MardelPlata1943.pgn) | Mar del Plata 1943 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1944.pgn`](https://www.pgnmentor.com/events/MardelPlata1944.pgn) | Mar del Plata 1944 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1945.pgn`](https://www.pgnmentor.com/events/MardelPlata1945.pgn) | Mar del Plata 1945 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1946.pgn`](https://www.pgnmentor.com/events/MardelPlata1946.pgn) | Mar del Plata 1946 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1947.pgn`](https://www.pgnmentor.com/events/MardelPlata1947.pgn) | Mar del Plata 1947 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1948.pgn`](https://www.pgnmentor.com/events/MardelPlata1948.pgn) | Mar del Plata 1948 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1949.pgn`](https://www.pgnmentor.com/events/MardelPlata1949.pgn) | Mar del Plata 1949 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1950.pgn`](https://www.pgnmentor.com/events/MardelPlata1950.pgn) | Mar del Plata 1950 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1951.pgn`](https://www.pgnmentor.com/events/MardelPlata1951.pgn) | Mar del Plata 1951 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1952.pgn`](https://www.pgnmentor.com/events/MardelPlata1952.pgn) | Mar del Plata 1952 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1953.pgn`](https://www.pgnmentor.com/events/MardelPlata1953.pgn) | Mar del Plata 1953 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1954.pgn`](https://www.pgnmentor.com/events/MardelPlata1954.pgn) | Mar del Plata 1954 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1955.pgn`](https://www.pgnmentor.com/events/MardelPlata1955.pgn) | Mar del Plata 1955 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1956.pgn`](https://www.pgnmentor.com/events/MardelPlata1956.pgn) | Mar del Plata 1956 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1957.pgn`](https://www.pgnmentor.com/events/MardelPlata1957.pgn) | Mar del Plata 1957 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1958.pgn`](https://www.pgnmentor.com/events/MardelPlata1958.pgn) | Mar del Plata 1958 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1959.pgn`](https://www.pgnmentor.com/events/MardelPlata1959.pgn) | Mar del Plata 1959 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1960.pgn`](https://www.pgnmentor.com/events/MardelPlata1960.pgn) | Mar del Plata 1960 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1961.pgn`](https://www.pgnmentor.com/events/MardelPlata1961.pgn) | Mar del Plata 1961 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1962.pgn`](https://www.pgnmentor.com/events/MardelPlata1962.pgn) | Mar del Plata 1962 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1965.pgn`](https://www.pgnmentor.com/events/MardelPlata1965.pgn) | Mar del Plata 1965 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1966.pgn`](https://www.pgnmentor.com/events/MardelPlata1966.pgn) | Mar del Plata 1966 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1967.pgn`](https://www.pgnmentor.com/events/MardelPlata1967.pgn) | Mar del Plata 1967 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1968.pgn`](https://www.pgnmentor.com/events/MardelPlata1968.pgn) | Mar del Plata 1968 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1969.pgn`](https://www.pgnmentor.com/events/MardelPlata1969.pgn) | Mar del Plata 1969 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1970.pgn`](https://www.pgnmentor.com/events/MardelPlata1970.pgn) | Mar del Plata 1970 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1971.pgn`](https://www.pgnmentor.com/events/MardelPlata1971.pgn) | Mar del Plata 1971 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1972.pgn`](https://www.pgnmentor.com/events/MardelPlata1972.pgn) | Mar del Plata 1972 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1973.pgn`](https://www.pgnmentor.com/events/MardelPlata1973.pgn) | Mar del Plata 1973 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1976.pgn`](https://www.pgnmentor.com/events/MardelPlata1976.pgn) | Mar del Plata 1976 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1979.pgn`](https://www.pgnmentor.com/events/MardelPlata1979.pgn) | Mar del Plata 1979 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1981.pgn`](https://www.pgnmentor.com/events/MardelPlata1981.pgn) | Mar del Plata 1981 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MardelPlata1982.pgn`](https://www.pgnmentor.com/events/MardelPlata1982.pgn) | Mar del Plata 1982 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Margate1935.pgn`](https://www.pgnmentor.com/events/Margate1935.pgn) | Margate 1935 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Margate1936.pgn`](https://www.pgnmentor.com/events/Margate1936.pgn) | Margate 1936 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Margate1937.pgn`](https://www.pgnmentor.com/events/Margate1937.pgn) | Margate 1937 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Margate1938.pgn`](https://www.pgnmentor.com/events/Margate1938.pgn) | Margate 1938 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Margate1939.pgn`](https://www.pgnmentor.com/events/Margate1939.pgn) | Margate 1939 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Marienbad1925.pgn`](https://www.pgnmentor.com/events/Marienbad1925.pgn) | Marienbad 1925 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Medias2011.pgn`](https://www.pgnmentor.com/events/Medias2011.pgn) | Medias 2011 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Meran1924.pgn`](https://www.pgnmentor.com/events/Meran1924.pgn) | Meran 1924 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Merano1926.pgn`](https://www.pgnmentor.com/events/Merano1926.pgn) | Merano 1926 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Merida2000.pgn`](https://www.pgnmentor.com/events/Merida2000.pgn) | Merida 2000 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Merida2001.pgn`](https://www.pgnmentor.com/events/Merida2001.pgn) | Merida 2001 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Milan1975.pgn`](https://www.pgnmentor.com/events/Milan1975.pgn) | Milan 1975 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MonteCarlo1901.pgn`](https://www.pgnmentor.com/events/MonteCarlo1901.pgn) | Monte Carlo 1901 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MonteCarlo1902.pgn`](https://www.pgnmentor.com/events/MonteCarlo1902.pgn) | Monte Carlo 1902 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MonteCarlo1903.pgn`](https://www.pgnmentor.com/events/MonteCarlo1903.pgn) | Monte Carlo 1903 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MonteCarlo1904.pgn`](https://www.pgnmentor.com/events/MonteCarlo1904.pgn) | Monte Carlo 1904 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/MonteCarlo1967.pgn`](https://www.pgnmentor.com/events/MonteCarlo1967.pgn) | Monte Carlo 1967 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Montecatini2000.pgn`](https://www.pgnmentor.com/events/Montecatini2000.pgn) | Montecatini 2000 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Montevideo1941.pgn`](https://www.pgnmentor.com/events/Montevideo1941.pgn) | Montevideo 1941 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Montreal1979.pgn`](https://www.pgnmentor.com/events/Montreal1979.pgn) | Montreal 1979 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow1899.pgn`](https://www.pgnmentor.com/events/Moscow1899.pgn) | Moscow 1899 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow1901.pgn`](https://www.pgnmentor.com/events/Moscow1901.pgn) | Moscow 1901 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow1920.pgn`](https://www.pgnmentor.com/events/Moscow1920.pgn) | Moscow 1920 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow1925.pgn`](https://www.pgnmentor.com/events/Moscow1925.pgn) | Moscow 1925 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow1935.pgn`](https://www.pgnmentor.com/events/Moscow1935.pgn) | Moscow 1935 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow1936.pgn`](https://www.pgnmentor.com/events/Moscow1936.pgn) | Moscow 1936 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow1947.pgn`](https://www.pgnmentor.com/events/Moscow1947.pgn) | Moscow 1947 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow1956.pgn`](https://www.pgnmentor.com/events/Moscow1956.pgn) | Moscow 1956 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow1959.pgn`](https://www.pgnmentor.com/events/Moscow1959.pgn) | Moscow 1959 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow1966.pgn`](https://www.pgnmentor.com/events/Moscow1966.pgn) | Moscow 1966 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow1967.pgn`](https://www.pgnmentor.com/events/Moscow1967.pgn) | Moscow 1967 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow1971.pgn`](https://www.pgnmentor.com/events/Moscow1971.pgn) | Moscow 1971 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow1975.pgn`](https://www.pgnmentor.com/events/Moscow1975.pgn) | Moscow 1975 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow1981.pgn`](https://www.pgnmentor.com/events/Moscow1981.pgn) | Moscow 1981 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow1985.pgn`](https://www.pgnmentor.com/events/Moscow1985.pgn) | Moscow 1985 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow1992.pgn`](https://www.pgnmentor.com/events/Moscow1992.pgn) | Moscow 1992 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow2005.pgn`](https://www.pgnmentor.com/events/Moscow2005.pgn) | Moscow 2005 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow2006.pgn`](https://www.pgnmentor.com/events/Moscow2006.pgn) | Moscow 2006 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow2007.pgn`](https://www.pgnmentor.com/events/Moscow2007.pgn) | Moscow 2007 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow2008.pgn`](https://www.pgnmentor.com/events/Moscow2008.pgn) | Moscow 2008 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow2009.pgn`](https://www.pgnmentor.com/events/Moscow2009.pgn) | Moscow 2009 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow2010.pgn`](https://www.pgnmentor.com/events/Moscow2010.pgn) | Moscow 2010 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow2011.pgn`](https://www.pgnmentor.com/events/Moscow2011.pgn) | Moscow 2011 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow2012.pgn`](https://www.pgnmentor.com/events/Moscow2012.pgn) | Moscow 2012 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow2013.pgn`](https://www.pgnmentor.com/events/Moscow2013.pgn) | Moscow 2013 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow2016.pgn`](https://www.pgnmentor.com/events/Moscow2016.pgn) | Moscow 2016 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow2017.pgn`](https://www.pgnmentor.com/events/Moscow2017.pgn) | Moscow 2017 GP |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow2019.pgn`](https://www.pgnmentor.com/events/Moscow2019.pgn) | Moscow 2019 GP |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Moscow2020.pgn`](https://www.pgnmentor.com/events/Moscow2020.pgn) | Moscow 2020 GP |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Munich1900.pgn`](https://www.pgnmentor.com/events/Munich1900.pgn) | Munich 1900 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Munich1941.pgn`](https://www.pgnmentor.com/events/Munich1941.pgn) | Munich 1941 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Munich1942.pgn`](https://www.pgnmentor.com/events/Munich1942.pgn) | Munich 1942 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Munich1993.pgn`](https://www.pgnmentor.com/events/Munich1993.pgn) | Munich 1993 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Naestved1985.pgn`](https://www.pgnmentor.com/events/Naestved1985.pgn) | Naestved 1985 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Nalchik2009.pgn`](https://www.pgnmentor.com/events/Nalchik2009.pgn) | Nalchik 2009 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Nanjing2008.pgn`](https://www.pgnmentor.com/events/Nanjing2008.pgn) | Nanjing 2008 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Nanjing2009.pgn`](https://www.pgnmentor.com/events/Nanjing2009.pgn) | Nanjing 2009 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Nanjing2010.pgn`](https://www.pgnmentor.com/events/Nanjing2010.pgn) | Nanjing 2010 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Netanya1968.pgn`](https://www.pgnmentor.com/events/Netanya1968.pgn) | Netanya 1968 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Netanya1969.pgn`](https://www.pgnmentor.com/events/Netanya1969.pgn) | Netanya 1969 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Netanya1973.pgn`](https://www.pgnmentor.com/events/Netanya1973.pgn) | Netanya 1973 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/NewYork1857.pgn`](https://www.pgnmentor.com/events/NewYork1857.pgn) | New York 1857 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/NewYork1880.pgn`](https://www.pgnmentor.com/events/NewYork1880.pgn) | New York 1880 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/NewYork1889.pgn`](https://www.pgnmentor.com/events/NewYork1889.pgn) | New York 1889 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/NewYork1893.pgn`](https://www.pgnmentor.com/events/NewYork1893.pgn) | New York 1893 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/NewYork1894.pgn`](https://www.pgnmentor.com/events/NewYork1894.pgn) | New York 1894 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/NewYork1913.pgn`](https://www.pgnmentor.com/events/NewYork1913.pgn) | New York 1913 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/NewYork1915.pgn`](https://www.pgnmentor.com/events/NewYork1915.pgn) | New York 1915 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/NewYork1916.pgn`](https://www.pgnmentor.com/events/NewYork1916.pgn) | New York 1916 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/NewYork1918.pgn`](https://www.pgnmentor.com/events/NewYork1918.pgn) | New York 1918 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/NewYork1924.pgn`](https://www.pgnmentor.com/events/NewYork1924.pgn) | New York 1924 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/NewYork1927.pgn`](https://www.pgnmentor.com/events/NewYork1927.pgn) | New York 1927 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/NewYork1931.pgn`](https://www.pgnmentor.com/events/NewYork1931.pgn) | New York 1931 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/NewYork1940.pgn`](https://www.pgnmentor.com/events/NewYork1940.pgn) | New York 1940 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/NewYork1951.pgn`](https://www.pgnmentor.com/events/NewYork1951.pgn) | New York 1951 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Nice1930.pgn`](https://www.pgnmentor.com/events/Nice1930.pgn) | Nice 1930 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Niksic1978.pgn`](https://www.pgnmentor.com/events/Niksic1978.pgn) | Niksic 1978 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Niksic1983.pgn`](https://www.pgnmentor.com/events/Niksic1983.pgn) | Niksic 1983 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Noordwijk1938.pgn`](https://www.pgnmentor.com/events/Noordwijk1938.pgn) | Noordwijk 1938 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Nottingham1936.pgn`](https://www.pgnmentor.com/events/Nottingham1936.pgn) | Nottingham 1936 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Novgorod1994.pgn`](https://www.pgnmentor.com/events/Novgorod1994.pgn) | Novgorod 1994 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Novgorod1995.pgn`](https://www.pgnmentor.com/events/Novgorod1995.pgn) | Novgorod 1995 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Novgorod1996.pgn`](https://www.pgnmentor.com/events/Novgorod1996.pgn) | Novgorod 1996 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Novgorod1997.pgn`](https://www.pgnmentor.com/events/Novgorod1997.pgn) | Novgorod 1997 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/NoviSad1984.pgn`](https://www.pgnmentor.com/events/NoviSad1984.pgn) | Novi Sad 1984 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Nuremberg1883.pgn`](https://www.pgnmentor.com/events/Nuremberg1883.pgn) | Nuremberg 1883 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Nuremberg1896.pgn`](https://www.pgnmentor.com/events/Nuremberg1896.pgn) | Nuremberg 1896 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Nuremberg1906.pgn`](https://www.pgnmentor.com/events/Nuremberg1906.pgn) | Nuremberg 1906 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Oslo1984.pgn`](https://www.pgnmentor.com/events/Oslo1984.pgn) | Oslo 1984 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Ostende1905.pgn`](https://www.pgnmentor.com/events/Ostende1905.pgn) | Ostende 1905 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Ostende1906.pgn`](https://www.pgnmentor.com/events/Ostende1906.pgn) | Ostende 1906 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Ostende1907a.pgn`](https://www.pgnmentor.com/events/Ostende1907a.pgn) | Ostende A 1907 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Ostende1907b.pgn`](https://www.pgnmentor.com/events/Ostende1907b.pgn) | Ostende B 1907 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Ostende1937.pgn`](https://www.pgnmentor.com/events/Ostende1937.pgn) | Ostende 1937 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Palma1966.pgn`](https://www.pgnmentor.com/events/Palma1966.pgn) | Palma 1966 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Palma1967.pgn`](https://www.pgnmentor.com/events/Palma1967.pgn) | Palma 1967 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Palma1968.pgn`](https://www.pgnmentor.com/events/Palma1968.pgn) | Palma 1968 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Palma1969.pgn`](https://www.pgnmentor.com/events/Palma1969.pgn) | Palma 1969 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Palma1970.pgn`](https://www.pgnmentor.com/events/Palma1970.pgn) | Palma 1970 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Palma1971.pgn`](https://www.pgnmentor.com/events/Palma1971.pgn) | Palma 1971 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Palma1972.pgn`](https://www.pgnmentor.com/events/Palma1972.pgn) | Palma 1972 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Pamplona2006.pgn`](https://www.pgnmentor.com/events/Pamplona2006.pgn) | Pamplona 2006 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Paris1867.pgn`](https://www.pgnmentor.com/events/Paris1867.pgn) | Paris 1867 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Paris1878.pgn`](https://www.pgnmentor.com/events/Paris1878.pgn) | Paris 1878 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Paris1900.pgn`](https://www.pgnmentor.com/events/Paris1900.pgn) | Paris 1900 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Paris1924.pgn`](https://www.pgnmentor.com/events/Paris1924.pgn) | Paris 1924 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Paris1925.pgn`](https://www.pgnmentor.com/events/Paris1925.pgn) | Paris 1925 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Paris1933.pgn`](https://www.pgnmentor.com/events/Paris1933.pgn) | Paris 1933 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Paris2013.pgn`](https://www.pgnmentor.com/events/Paris2013.pgn) | Paris GP 2013 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Parnu1937.pgn`](https://www.pgnmentor.com/events/Parnu1937.pgn) | Parnu 1937 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Parnu1947.pgn`](https://www.pgnmentor.com/events/Parnu1947.pgn) | Parnu 1947 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Parnu1996.pgn`](https://www.pgnmentor.com/events/Parnu1996.pgn) | Parnu 1996 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Pasadena1932.pgn`](https://www.pgnmentor.com/events/Pasadena1932.pgn) | Pasadena 1932 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/PCACand1994.pgn`](https://www.pgnmentor.com/events/PCACand1994.pgn) | PCA Candidates 1994 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/PCAChamp1993.pgn`](https://www.pgnmentor.com/events/PCAChamp1993.pgn) | PCA Championship 1993 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/PCAChamp1995.pgn`](https://www.pgnmentor.com/events/PCAChamp1995.pgn) | PCA Championship 1995 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/PCAQual1993.pgn`](https://www.pgnmentor.com/events/PCAQual1993.pgn) | PCA Qualifier 1993 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Philadelphia1876.pgn`](https://www.pgnmentor.com/events/Philadelphia1876.pgn) | Philadelphia 1876 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Podebrady1936.pgn`](https://www.pgnmentor.com/events/Podebrady1936.pgn) | Podebrady 1936 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Poikovsky2004.pgn`](https://www.pgnmentor.com/events/Poikovsky2004.pgn) | Poikovsky 2004 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Poikovsky2005.pgn`](https://www.pgnmentor.com/events/Poikovsky2005.pgn) | Poikovsky 2005 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Poikovsky2006.pgn`](https://www.pgnmentor.com/events/Poikovsky2006.pgn) | Poikovsky 2006 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Poikovsky2007.pgn`](https://www.pgnmentor.com/events/Poikovsky2007.pgn) | Poikovsky 2007 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Poikovsky2008.pgn`](https://www.pgnmentor.com/events/Poikovsky2008.pgn) | Poikovsky 2008 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Poikovsky2009.pgn`](https://www.pgnmentor.com/events/Poikovsky2009.pgn) | Poikovsky 2009 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Polanica1998.pgn`](https://www.pgnmentor.com/events/Polanica1998.pgn) | Polanica 1998 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Polanica2000.pgn`](https://www.pgnmentor.com/events/Polanica2000.pgn) | Polanica 2000 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Portoroz1985.pgn`](https://www.pgnmentor.com/events/Portoroz1985.pgn) | Portoroz 1985 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Prague1908.pgn`](https://www.pgnmentor.com/events/Prague1908.pgn) | Prague 1908 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Prague1942.pgn`](https://www.pgnmentor.com/events/Prague1942.pgn) | Prague 1942 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Prague1943.pgn`](https://www.pgnmentor.com/events/Prague1943.pgn) | Prague 1943 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Ramsgate1929.pgn`](https://www.pgnmentor.com/events/Ramsgate1929.pgn) | Ramsgate 1929 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/ReggioEmilia1985.pgn`](https://www.pgnmentor.com/events/ReggioEmilia1985.pgn) | Reggio Emilia 1985 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/ReggioEmilia1986.pgn`](https://www.pgnmentor.com/events/ReggioEmilia1986.pgn) | Reggio Emilia 1986 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/ReggioEmilia1987.pgn`](https://www.pgnmentor.com/events/ReggioEmilia1987.pgn) | Reggio Emilia 1987 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/ReggioEmilia1989.pgn`](https://www.pgnmentor.com/events/ReggioEmilia1989.pgn) | Reggio Emilia 1989 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/ReggioEmilia1991.pgn`](https://www.pgnmentor.com/events/ReggioEmilia1991.pgn) | Reggio Emilia 1991 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/ReggioEmilia1992.pgn`](https://www.pgnmentor.com/events/ReggioEmilia1992.pgn) | Reggio Emilia 1992 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/ReggioEmilia2012.pgn`](https://www.pgnmentor.com/events/ReggioEmilia2012.pgn) | Reggio Emilia 2012 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Reykjavik1987.pgn`](https://www.pgnmentor.com/events/Reykjavik1987.pgn) | Reykjavik 1987 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Reykjavik1988.pgn`](https://www.pgnmentor.com/events/Reykjavik1988.pgn) | Reykjavik 1988 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Reykjavik1991.pgn`](https://www.pgnmentor.com/events/Reykjavik1991.pgn) | Reykjavik 1991 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Riga1995.pgn`](https://www.pgnmentor.com/events/Riga1995.pgn) | Riga 1995 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Riga2019.pgn`](https://www.pgnmentor.com/events/Riga2019.pgn) | Riga 2019 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Rogaska1929.pgn`](https://www.pgnmentor.com/events/Rogaska1929.pgn) | Rogaska 1929 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Rosario1939.pgn`](https://www.pgnmentor.com/events/Rosario1939.pgn) | Rosario 1939 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Rotterdam1989.pgn`](https://www.pgnmentor.com/events/Rotterdam1989.pgn) | Rotterdam 1989 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Rovinj1970.pgn`](https://www.pgnmentor.com/events/Rovinj1970.pgn) | Rovinj 1970 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SaintLouis2014.pgn`](https://www.pgnmentor.com/events/SaintLouis2014.pgn) | Saint Louis 2014 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SaintLouis2015.pgn`](https://www.pgnmentor.com/events/SaintLouis2015.pgn) | Saint Louis 2015 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SaintLouis2016.pgn`](https://www.pgnmentor.com/events/SaintLouis2016.pgn) | Saint Louis 2016 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SaintLouis2017.pgn`](https://www.pgnmentor.com/events/SaintLouis2017.pgn) | Saint Louis 2017 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SaintLouis2018.pgn`](https://www.pgnmentor.com/events/SaintLouis2018.pgn) | Saint Louis 2018 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SaintLouis2019.pgn`](https://www.pgnmentor.com/events/SaintLouis2019.pgn) | Saint Louis 2019 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SaintLouis2021.pgn`](https://www.pgnmentor.com/events/SaintLouis2021.pgn) | Saint Louis 2021 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SaintLouis2022-Sinq.pgn`](https://www.pgnmentor.com/events/SaintLouis2022-Sinq.pgn) | Saint Louis 2022 Sinquefield Cup |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SaintLouis2022.pgn`](https://www.pgnmentor.com/events/SaintLouis2022.pgn) | Saint Louis 2022 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SaintLouis2023.pgn`](https://www.pgnmentor.com/events/SaintLouis2023.pgn) | Saint Louis 2023 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Salzburg1942.pgn`](https://www.pgnmentor.com/events/Salzburg1942.pgn) | Salzburg 1942 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Salzburg1943.pgn`](https://www.pgnmentor.com/events/Salzburg1943.pgn) | Salzburg 1943 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SanAntonio1972.pgn`](https://www.pgnmentor.com/events/SanAntonio1972.pgn) | SanAntonio 1972 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SanRemo1930.pgn`](https://www.pgnmentor.com/events/SanRemo1930.pgn) | SanRemo 1930 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SanSebastian1911.pgn`](https://www.pgnmentor.com/events/SanSebastian1911.pgn) | San Sebastian 1911 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SanSebastian1912.pgn`](https://www.pgnmentor.com/events/SanSebastian1912.pgn) | San Sebastian 1912 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SantaMonica1966.pgn`](https://www.pgnmentor.com/events/SantaMonica1966.pgn) | Santa Monica 1966 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Sarajevo1984.pgn`](https://www.pgnmentor.com/events/Sarajevo1984.pgn) | Sarajevo 1984 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Sarajevo1999.pgn`](https://www.pgnmentor.com/events/Sarajevo1999.pgn) | Sarajevo 1999 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Sarajevo2000.pgn`](https://www.pgnmentor.com/events/Sarajevo2000.pgn) | Sarajevo 2000 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Sarajevo2008.pgn`](https://www.pgnmentor.com/events/Sarajevo2008.pgn) | Sarajevo 2008 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Scarborough1930.pgn`](https://www.pgnmentor.com/events/Scarborough1930.pgn) | Scarborough 1930 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Semmering1926.pgn`](https://www.pgnmentor.com/events/Semmering1926.pgn) | Semmering 1926 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Semmering1937.pgn`](https://www.pgnmentor.com/events/Semmering1937.pgn) | Semmering 1937 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Shamkir2014.pgn`](https://www.pgnmentor.com/events/Shamkir2014.pgn) | Shamkir 2014 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Shamkir2015.pgn`](https://www.pgnmentor.com/events/Shamkir2015.pgn) | Shamkir 2015 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Shamkir2016.pgn`](https://www.pgnmentor.com/events/Shamkir2016.pgn) | Shamkir 2016 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Shamkir2017.pgn`](https://www.pgnmentor.com/events/Shamkir2017.pgn) | Shamkir 2017 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Shamkir2018.pgn`](https://www.pgnmentor.com/events/Shamkir2018.pgn) | Shamkir 2018 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Shamkir2019.pgn`](https://www.pgnmentor.com/events/Shamkir2019.pgn) | Shamkir 2019 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Sharjah2017.pgn`](https://www.pgnmentor.com/events/Sharjah2017.pgn) | Sharjah 2017 GP |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Shenzhen2019.pgn`](https://www.pgnmentor.com/events/Shenzhen2019.pgn) | Shenzhen 2019 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Skelleftea1989.pgn`](https://www.pgnmentor.com/events/Skelleftea1989.pgn) | Skelleftea 1989 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Skopje1967.pgn`](https://www.pgnmentor.com/events/Skopje1967.pgn) | Skopje 1967 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Sliac1932.pgn`](https://www.pgnmentor.com/events/Sliac1932.pgn) | Sliac 1932 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Sochi1973.pgn`](https://www.pgnmentor.com/events/Sochi1973.pgn) | Sochi 1973 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Sochi1982.pgn`](https://www.pgnmentor.com/events/Sochi1982.pgn) | Sochi 1982 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Sochi2008.pgn`](https://www.pgnmentor.com/events/Sochi2008.pgn) | Sochi 2008 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Sofia2005.pgn`](https://www.pgnmentor.com/events/Sofia2005.pgn) | Sofia 2005 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Sofia2006.pgn`](https://www.pgnmentor.com/events/Sofia2006.pgn) | Sofia 2006 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Sofia2007.pgn`](https://www.pgnmentor.com/events/Sofia2007.pgn) | Sofia 2007 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Sofia2008.pgn`](https://www.pgnmentor.com/events/Sofia2008.pgn) | Sofia 2008 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Sofia2009.pgn`](https://www.pgnmentor.com/events/Sofia2009.pgn) | Sofia 2009 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1920.pgn`](https://www.pgnmentor.com/events/SovietChamp1920.pgn) | Soviet Championship 1920 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1923.pgn`](https://www.pgnmentor.com/events/SovietChamp1923.pgn) | Soviet Championship 1923 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1924.pgn`](https://www.pgnmentor.com/events/SovietChamp1924.pgn) | Soviet Championship 1924 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1925.pgn`](https://www.pgnmentor.com/events/SovietChamp1925.pgn) | Soviet Championship 1925 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1927.pgn`](https://www.pgnmentor.com/events/SovietChamp1927.pgn) | Soviet Championship 1927 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1929.pgn`](https://www.pgnmentor.com/events/SovietChamp1929.pgn) | Soviet Championship 1929 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1931.pgn`](https://www.pgnmentor.com/events/SovietChamp1931.pgn) | Soviet Championship 1931 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1933.pgn`](https://www.pgnmentor.com/events/SovietChamp1933.pgn) | Soviet Championship 1933 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1934.pgn`](https://www.pgnmentor.com/events/SovietChamp1934.pgn) | Soviet Championship 1934 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1937.pgn`](https://www.pgnmentor.com/events/SovietChamp1937.pgn) | Soviet Championship 1937 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1939.pgn`](https://www.pgnmentor.com/events/SovietChamp1939.pgn) | Soviet Championship 1939 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1940.pgn`](https://www.pgnmentor.com/events/SovietChamp1940.pgn) | Soviet Championship 1940 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1944.pgn`](https://www.pgnmentor.com/events/SovietChamp1944.pgn) | Soviet Championship 1944 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1945.pgn`](https://www.pgnmentor.com/events/SovietChamp1945.pgn) | Soviet Championship 1945 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1947.pgn`](https://www.pgnmentor.com/events/SovietChamp1947.pgn) | Soviet Championship 1947 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1948.pgn`](https://www.pgnmentor.com/events/SovietChamp1948.pgn) | Soviet Championship 1948 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1949.pgn`](https://www.pgnmentor.com/events/SovietChamp1949.pgn) | Soviet Championship 1949 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1950.pgn`](https://www.pgnmentor.com/events/SovietChamp1950.pgn) | Soviet Championship 1950 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1951.pgn`](https://www.pgnmentor.com/events/SovietChamp1951.pgn) | Soviet Championship 1951 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1952.pgn`](https://www.pgnmentor.com/events/SovietChamp1952.pgn) | Soviet Championship 1952 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1953.pgn`](https://www.pgnmentor.com/events/SovietChamp1953.pgn) | Soviet Championship 1953 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1955.pgn`](https://www.pgnmentor.com/events/SovietChamp1955.pgn) | Soviet Championship 1955 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1956.pgn`](https://www.pgnmentor.com/events/SovietChamp1956.pgn) | Soviet Championship 1956 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1957.pgn`](https://www.pgnmentor.com/events/SovietChamp1957.pgn) | Soviet Championship 1957 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1958.pgn`](https://www.pgnmentor.com/events/SovietChamp1958.pgn) | Soviet Championship 1958 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1959.pgn`](https://www.pgnmentor.com/events/SovietChamp1959.pgn) | Soviet Championship 1959 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1960.pgn`](https://www.pgnmentor.com/events/SovietChamp1960.pgn) | Soviet Championship 1960 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1961a.pgn`](https://www.pgnmentor.com/events/SovietChamp1961a.pgn) | Soviet Championship A 1961 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1961b.pgn`](https://www.pgnmentor.com/events/SovietChamp1961b.pgn) | Soviet Championship B 1961 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1962.pgn`](https://www.pgnmentor.com/events/SovietChamp1962.pgn) | Soviet Championship 1962 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1963.pgn`](https://www.pgnmentor.com/events/SovietChamp1963.pgn) | Soviet Championship 1963 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1964.pgn`](https://www.pgnmentor.com/events/SovietChamp1964.pgn) | Soviet Championship 1964 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1965.pgn`](https://www.pgnmentor.com/events/SovietChamp1965.pgn) | Soviet Championship 1965 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1966.pgn`](https://www.pgnmentor.com/events/SovietChamp1966.pgn) | Soviet Championship 1966 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1967.pgn`](https://www.pgnmentor.com/events/SovietChamp1967.pgn) | Soviet Championship 1967 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1968.pgn`](https://www.pgnmentor.com/events/SovietChamp1968.pgn) | Soviet Championship 1968 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1969.pgn`](https://www.pgnmentor.com/events/SovietChamp1969.pgn) | Soviet Championship 1969 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1970.pgn`](https://www.pgnmentor.com/events/SovietChamp1970.pgn) | Soviet Championship 1970 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1971.pgn`](https://www.pgnmentor.com/events/SovietChamp1971.pgn) | Soviet Championship 1971 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1972.pgn`](https://www.pgnmentor.com/events/SovietChamp1972.pgn) | Soviet Championship 1972 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1973.pgn`](https://www.pgnmentor.com/events/SovietChamp1973.pgn) | Soviet Championship 1973 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1974.pgn`](https://www.pgnmentor.com/events/SovietChamp1974.pgn) | Soviet Championship 1974 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1975.pgn`](https://www.pgnmentor.com/events/SovietChamp1975.pgn) | Soviet Championship 1975 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1976.pgn`](https://www.pgnmentor.com/events/SovietChamp1976.pgn) | Soviet Championship 1976 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1977.pgn`](https://www.pgnmentor.com/events/SovietChamp1977.pgn) | Soviet Championship 1977 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1978.pgn`](https://www.pgnmentor.com/events/SovietChamp1978.pgn) | Soviet Championship 1978 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1979.pgn`](https://www.pgnmentor.com/events/SovietChamp1979.pgn) | Soviet Championship 1979 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1980.pgn`](https://www.pgnmentor.com/events/SovietChamp1980.pgn) | Soviet Championship 1980 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1981.pgn`](https://www.pgnmentor.com/events/SovietChamp1981.pgn) | Soviet Championship 1981 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1983.pgn`](https://www.pgnmentor.com/events/SovietChamp1983.pgn) | Soviet Championship 1983 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1984.pgn`](https://www.pgnmentor.com/events/SovietChamp1984.pgn) | Soviet Championship 1984 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1985.pgn`](https://www.pgnmentor.com/events/SovietChamp1985.pgn) | Soviet Championship 1985 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1986.pgn`](https://www.pgnmentor.com/events/SovietChamp1986.pgn) | Soviet Championship 1986 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1987.pgn`](https://www.pgnmentor.com/events/SovietChamp1987.pgn) | Soviet Championship 1987 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1988.pgn`](https://www.pgnmentor.com/events/SovietChamp1988.pgn) | Soviet Championship 1988 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1989.pgn`](https://www.pgnmentor.com/events/SovietChamp1989.pgn) | Soviet Championship 1989 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1990.pgn`](https://www.pgnmentor.com/events/SovietChamp1990.pgn) | Soviet Championship 1990 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/SovietChamp1991.pgn`](https://www.pgnmentor.com/events/SovietChamp1991.pgn) | Soviet Championship 1991 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Stavanger2013.pgn`](https://www.pgnmentor.com/events/Stavanger2013.pgn) | Stavanger 2013 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Stavanger2014.pgn`](https://www.pgnmentor.com/events/Stavanger2014.pgn) | Stavanger 2014 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Stavanger2015.pgn`](https://www.pgnmentor.com/events/Stavanger2015.pgn) | Stavanger 2015 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Stavanger2016.pgn`](https://www.pgnmentor.com/events/Stavanger2016.pgn) | Stavanger 2016 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Stavanger2017.pgn`](https://www.pgnmentor.com/events/Stavanger2017.pgn) | Stavanger 2017 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Stavanger2018.pgn`](https://www.pgnmentor.com/events/Stavanger2018.pgn) | Stavanger 2018 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Stavanger2019.pgn`](https://www.pgnmentor.com/events/Stavanger2019.pgn) | Stavanger 2019 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Stavanger2020.pgn`](https://www.pgnmentor.com/events/Stavanger2020.pgn) | Stavanger 2020 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Stavanger2021.pgn`](https://www.pgnmentor.com/events/Stavanger2021.pgn) | Stavanger 2021 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Stavanger2022.pgn`](https://www.pgnmentor.com/events/Stavanger2022.pgn) | Stavanger 2022 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Stavanger2022a.pgn`](https://www.pgnmentor.com/events/Stavanger2022a.pgn) | Stavanger 2022 Armaged |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Stavanger2023.pgn`](https://www.pgnmentor.com/events/Stavanger2023.pgn) | Stavanger 2023 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Stavanger2024.pgn`](https://www.pgnmentor.com/events/Stavanger2024.pgn) | Stavanger 2024 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Stepanakert2005.pgn`](https://www.pgnmentor.com/events/Stepanakert2005.pgn) | Stepanakert 2005 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/StLouis1904.pgn`](https://www.pgnmentor.com/events/StLouis1904.pgn) | St Louis 1904 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Stockholm1930.pgn`](https://www.pgnmentor.com/events/Stockholm1930.pgn) | Stockholm 1930 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/StPetersburg1878.pgn`](https://www.pgnmentor.com/events/StPetersburg1878.pgn) | St Petersburg 1878 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/StPetersburg1895.pgn`](https://www.pgnmentor.com/events/StPetersburg1895.pgn) | St Petersburg 1895 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/StPetersburg1905.pgn`](https://www.pgnmentor.com/events/StPetersburg1905.pgn) | St Petersburg 1905 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/StPetersburg1909.pgn`](https://www.pgnmentor.com/events/StPetersburg1909.pgn) | St Petersburg 1909 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/StPetersburg1913.pgn`](https://www.pgnmentor.com/events/StPetersburg1913.pgn) | St Petersburg 1913 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/StPetersburg1914.pgn`](https://www.pgnmentor.com/events/StPetersburg1914.pgn) | St Petersburg 1914 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Stuttgart1939.pgn`](https://www.pgnmentor.com/events/Stuttgart1939.pgn) | Stuttgart 1939 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Sverdlovsk1943.pgn`](https://www.pgnmentor.com/events/Sverdlovsk1943.pgn) | Sverdlovsk 1943 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Swinemunde1930.pgn`](https://www.pgnmentor.com/events/Swinemunde1930.pgn) | Swinemunde 1930 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Swinemunde1931.pgn`](https://www.pgnmentor.com/events/Swinemunde1931.pgn) | Swinemunde 1931 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Szcawno1950.pgn`](https://www.pgnmentor.com/events/Szcawno1950.pgn) | Szcawno 1950 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Tashkent2012.pgn`](https://www.pgnmentor.com/events/Tashkent2012.pgn) | Tashkent GP 2012 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Tbilisi2015.pgn`](https://www.pgnmentor.com/events/Tbilisi2015.pgn) | Tbilisi GP 2015 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Teeside1975.pgn`](https://www.pgnmentor.com/events/Teeside1975.pgn) | Teeside 1975 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Teplitz1922.pgn`](https://www.pgnmentor.com/events/Teplitz1922.pgn) | Teplitz 1922 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/TerApel1997.pgn`](https://www.pgnmentor.com/events/TerApel1997.pgn) | TerApel 1997 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Thessalonika2013.pgn`](https://www.pgnmentor.com/events/Thessalonika2013.pgn) | Thessalonika GP 2013 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Tilburg1977.pgn`](https://www.pgnmentor.com/events/Tilburg1977.pgn) | Tilburg 1977 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Tilburg1978.pgn`](https://www.pgnmentor.com/events/Tilburg1978.pgn) | Tilburg 1978 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Tilburg1979.pgn`](https://www.pgnmentor.com/events/Tilburg1979.pgn) | Tilburg 1979 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Tilburg1980.pgn`](https://www.pgnmentor.com/events/Tilburg1980.pgn) | Tilburg 1980 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Tilburg1981.pgn`](https://www.pgnmentor.com/events/Tilburg1981.pgn) | Tilburg 1981 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Tilburg1982.pgn`](https://www.pgnmentor.com/events/Tilburg1982.pgn) | Tilburg 1982 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Tilburg1983.pgn`](https://www.pgnmentor.com/events/Tilburg1983.pgn) | Tilburg 1983 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Tilburg1984.pgn`](https://www.pgnmentor.com/events/Tilburg1984.pgn) | Tilburg 1984 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Tilburg1985.pgn`](https://www.pgnmentor.com/events/Tilburg1985.pgn) | Tilburg 1985 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Tilburg1986.pgn`](https://www.pgnmentor.com/events/Tilburg1986.pgn) | Tilburg 1986 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Tilburg1987.pgn`](https://www.pgnmentor.com/events/Tilburg1987.pgn) | Tilburg 1987 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Tilburg1989.pgn`](https://www.pgnmentor.com/events/Tilburg1989.pgn) | Tilburg 1989 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Tilburg1990.pgn`](https://www.pgnmentor.com/events/Tilburg1990.pgn) | Tilburg 1990 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Tilburg1991.pgn`](https://www.pgnmentor.com/events/Tilburg1991.pgn) | Tilburg 1991 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Tilburg1992.pgn`](https://www.pgnmentor.com/events/Tilburg1992.pgn) | Tilburg 1992 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Tilburg1993.pgn`](https://www.pgnmentor.com/events/Tilburg1993.pgn) | Tilburg 1993 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Tilburg1994.pgn`](https://www.pgnmentor.com/events/Tilburg1994.pgn) | Tilburg 1994 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Tilburg1996.pgn`](https://www.pgnmentor.com/events/Tilburg1996.pgn) | Tilburg 1996 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Tilburg1997.pgn`](https://www.pgnmentor.com/events/Tilburg1997.pgn) | Tilburg 1997 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Tilburg1998.pgn`](https://www.pgnmentor.com/events/Tilburg1998.pgn) | Tilburg 1998 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Titograd1984.pgn`](https://www.pgnmentor.com/events/Titograd1984.pgn) | Titograd 1984 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Trencianske1941.pgn`](https://www.pgnmentor.com/events/Trencianske1941.pgn) | Trencianske 1941 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Trencianske1949.pgn`](https://www.pgnmentor.com/events/Trencianske1949.pgn) | Trencianske 1949 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Triberg1915.pgn`](https://www.pgnmentor.com/events/Triberg1915.pgn) | Triberg 1915 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Triberg1921.pgn`](https://www.pgnmentor.com/events/Triberg1921.pgn) | Triberg 1921 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Turin1982.pgn`](https://www.pgnmentor.com/events/Turin1982.pgn) | Turin 1982 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Ujpest1934.pgn`](https://www.pgnmentor.com/events/Ujpest1934.pgn) | Ujpest 1934 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Vienna1873.pgn`](https://www.pgnmentor.com/events/Vienna1873.pgn) | Vienna 1873 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Vienna1882.pgn`](https://www.pgnmentor.com/events/Vienna1882.pgn) | Vienna 1882 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Vienna1898.pgn`](https://www.pgnmentor.com/events/Vienna1898.pgn) | Vienna 1898 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Vienna1899.pgn`](https://www.pgnmentor.com/events/Vienna1899.pgn) | Vienna 1899 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Vienna1903.pgn`](https://www.pgnmentor.com/events/Vienna1903.pgn) | Vienna 1903 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Vienna1907.pgn`](https://www.pgnmentor.com/events/Vienna1907.pgn) | Vienna 1907 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Vienna1908.pgn`](https://www.pgnmentor.com/events/Vienna1908.pgn) | Vienna 1908 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Vienna1922.pgn`](https://www.pgnmentor.com/events/Vienna1922.pgn) | Vienna 1922 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Vienna1923.pgn`](https://www.pgnmentor.com/events/Vienna1923.pgn) | Vienna 1923 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Vienna1937.pgn`](https://www.pgnmentor.com/events/Vienna1937.pgn) | Vienna 1937 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Vienna1996.pgn`](https://www.pgnmentor.com/events/Vienna1996.pgn) | Vienna 1996 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Vilnius1909.pgn`](https://www.pgnmentor.com/events/Vilnius1909.pgn) | Vilnius 1909 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Vilnius1912.pgn`](https://www.pgnmentor.com/events/Vilnius1912.pgn) | Vilnius 1912 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Vinkovci1968.pgn`](https://www.pgnmentor.com/events/Vinkovci1968.pgn) | Vinkovci 1968 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Vrbas1980.pgn`](https://www.pgnmentor.com/events/Vrbas1980.pgn) | Vrbas 1980 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Waddinxveen1979.pgn`](https://www.pgnmentor.com/events/Waddinxveen1979.pgn) | Waddinxveen 1979 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Warsaw1947.pgn`](https://www.pgnmentor.com/events/Warsaw1947.pgn) | Warsaw 1947 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WccQual1998.pgn`](https://www.pgnmentor.com/events/WccQual1998.pgn) | WCC Qualifier 1998 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WccQual2002.pgn`](https://www.pgnmentor.com/events/WccQual2002.pgn) | WCC Qualifier 2002 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WccQual2007.pgn`](https://www.pgnmentor.com/events/WccQual2007.pgn) | WCC Qualifier 2007 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WccQual2009.pgn`](https://www.pgnmentor.com/events/WccQual2009.pgn) | WCC Qualifier 2009 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1968.pgn`](https://www.pgnmentor.com/events/WijkaanZee1968.pgn) | Wijk aan Zee 1968 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1969.pgn`](https://www.pgnmentor.com/events/WijkaanZee1969.pgn) | Wijk aan Zee 1969 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1970.pgn`](https://www.pgnmentor.com/events/WijkaanZee1970.pgn) | Wijk aan Zee 1970 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1971.pgn`](https://www.pgnmentor.com/events/WijkaanZee1971.pgn) | Wijk aan Zee 1971 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1972.pgn`](https://www.pgnmentor.com/events/WijkaanZee1972.pgn) | Wijk aan Zee 1972 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1973.pgn`](https://www.pgnmentor.com/events/WijkaanZee1973.pgn) | Wijk aan Zee 1973 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1974.pgn`](https://www.pgnmentor.com/events/WijkaanZee1974.pgn) | Wijk aan Zee 1974 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1975.pgn`](https://www.pgnmentor.com/events/WijkaanZee1975.pgn) | Wijk aan Zee 1975 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1976.pgn`](https://www.pgnmentor.com/events/WijkaanZee1976.pgn) | Wijk aan Zee 1976 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1977.pgn`](https://www.pgnmentor.com/events/WijkaanZee1977.pgn) | Wijk aan Zee 1977 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1978.pgn`](https://www.pgnmentor.com/events/WijkaanZee1978.pgn) | Wijk aan Zee 1978 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1979.pgn`](https://www.pgnmentor.com/events/WijkaanZee1979.pgn) | Wijk aan Zee 1979 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1980.pgn`](https://www.pgnmentor.com/events/WijkaanZee1980.pgn) | Wijk aan Zee 1980 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1981.pgn`](https://www.pgnmentor.com/events/WijkaanZee1981.pgn) | Wijk aan Zee 1981 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1982.pgn`](https://www.pgnmentor.com/events/WijkaanZee1982.pgn) | Wijk aan Zee 1982 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1983.pgn`](https://www.pgnmentor.com/events/WijkaanZee1983.pgn) | Wijk aan Zee 1983 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1984.pgn`](https://www.pgnmentor.com/events/WijkaanZee1984.pgn) | Wijk aan Zee 1984 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1985.pgn`](https://www.pgnmentor.com/events/WijkaanZee1985.pgn) | Wijk aan Zee 1985 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1986.pgn`](https://www.pgnmentor.com/events/WijkaanZee1986.pgn) | Wijk aan Zee 1986 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1987.pgn`](https://www.pgnmentor.com/events/WijkaanZee1987.pgn) | Wijk aan Zee 1987 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1988.pgn`](https://www.pgnmentor.com/events/WijkaanZee1988.pgn) | Wijk aan Zee 1988 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1989.pgn`](https://www.pgnmentor.com/events/WijkaanZee1989.pgn) | Wijk aan Zee 1989 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1990.pgn`](https://www.pgnmentor.com/events/WijkaanZee1990.pgn) | Wijk aan Zee 1990 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1991.pgn`](https://www.pgnmentor.com/events/WijkaanZee1991.pgn) | Wijk aan Zee 1991 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1992.pgn`](https://www.pgnmentor.com/events/WijkaanZee1992.pgn) | Wijk aan Zee 1992 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1993.pgn`](https://www.pgnmentor.com/events/WijkaanZee1993.pgn) | Wijk aan Zee 1993 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1994.pgn`](https://www.pgnmentor.com/events/WijkaanZee1994.pgn) | Wijk aan Zee 1994 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1995.pgn`](https://www.pgnmentor.com/events/WijkaanZee1995.pgn) | Wijk aan Zee 1995 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1996.pgn`](https://www.pgnmentor.com/events/WijkaanZee1996.pgn) | Wijk aan Zee 1996 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1997.pgn`](https://www.pgnmentor.com/events/WijkaanZee1997.pgn) | Wijk aan Zee 1997 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1998.pgn`](https://www.pgnmentor.com/events/WijkaanZee1998.pgn) | Wijk aan Zee 1998 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee1999.pgn`](https://www.pgnmentor.com/events/WijkaanZee1999.pgn) | Wijk aan Zee 1999 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2000.pgn`](https://www.pgnmentor.com/events/WijkaanZee2000.pgn) | Wijk aan Zee 2000 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2001.pgn`](https://www.pgnmentor.com/events/WijkaanZee2001.pgn) | Wijk aan Zee 2001 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2002.pgn`](https://www.pgnmentor.com/events/WijkaanZee2002.pgn) | Wijk aan Zee 2002 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2003.pgn`](https://www.pgnmentor.com/events/WijkaanZee2003.pgn) | Wijk aan Zee 2003 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2004.pgn`](https://www.pgnmentor.com/events/WijkaanZee2004.pgn) | Wijk aan Zee 2004 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2005.pgn`](https://www.pgnmentor.com/events/WijkaanZee2005.pgn) | Wijk aan Zee 2005 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2006.pgn`](https://www.pgnmentor.com/events/WijkaanZee2006.pgn) | Wijk aan Zee 2006 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2007.pgn`](https://www.pgnmentor.com/events/WijkaanZee2007.pgn) | Wijk aan Zee 2007 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2008.pgn`](https://www.pgnmentor.com/events/WijkaanZee2008.pgn) | Wijk aan Zee 2008 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2009.pgn`](https://www.pgnmentor.com/events/WijkaanZee2009.pgn) | Wijk aan Zee 2009 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2010.pgn`](https://www.pgnmentor.com/events/WijkaanZee2010.pgn) | Wijk aan Zee 2010 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2011.pgn`](https://www.pgnmentor.com/events/WijkaanZee2011.pgn) | Wijk aan Zee 2011 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2012.pgn`](https://www.pgnmentor.com/events/WijkaanZee2012.pgn) | Wijk aan Zee 2012 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2013.pgn`](https://www.pgnmentor.com/events/WijkaanZee2013.pgn) | Wijk aan Zee 2013 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2014.pgn`](https://www.pgnmentor.com/events/WijkaanZee2014.pgn) | Wijk aan Zee 2014 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2015.pgn`](https://www.pgnmentor.com/events/WijkaanZee2015.pgn) | Wijk aan Zee 2015 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2016.pgn`](https://www.pgnmentor.com/events/WijkaanZee2016.pgn) | Wijk aan Zee 2016 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2017.pgn`](https://www.pgnmentor.com/events/WijkaanZee2017.pgn) | Wijk aan Zee 2017 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2018.pgn`](https://www.pgnmentor.com/events/WijkaanZee2018.pgn) | Wijk aan Zee 2018 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2019.pgn`](https://www.pgnmentor.com/events/WijkaanZee2019.pgn) | Wijk aan Zee 2019 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2020.pgn`](https://www.pgnmentor.com/events/WijkaanZee2020.pgn) | Wijk aan Zee 2020 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2021.pgn`](https://www.pgnmentor.com/events/WijkaanZee2021.pgn) | Wijk aan Zee 2021 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2022.pgn`](https://www.pgnmentor.com/events/WijkaanZee2022.pgn) | Wijk aan Zee 2022 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2023.pgn`](https://www.pgnmentor.com/events/WijkaanZee2023.pgn) | Wijk aan Zee 2023 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WijkaanZee2024.pgn`](https://www.pgnmentor.com/events/WijkaanZee2024.pgn) | Wijk aan Zee 2024 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Winnipeg1967.pgn`](https://www.pgnmentor.com/events/Winnipeg1967.pgn) | Winnipeg 1967 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1886.pgn`](https://www.pgnmentor.com/events/WorldChamp1886.pgn) | World Championship 1886 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1889.pgn`](https://www.pgnmentor.com/events/WorldChamp1889.pgn) | World Championship 1889 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1890.pgn`](https://www.pgnmentor.com/events/WorldChamp1890.pgn) | World Championship 1890 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1892.pgn`](https://www.pgnmentor.com/events/WorldChamp1892.pgn) | World Championship 1892 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1894.pgn`](https://www.pgnmentor.com/events/WorldChamp1894.pgn) | World Championship 1894 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1896.pgn`](https://www.pgnmentor.com/events/WorldChamp1896.pgn) | World Championship 1896 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1907.pgn`](https://www.pgnmentor.com/events/WorldChamp1907.pgn) | World Championship 1907 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1908.pgn`](https://www.pgnmentor.com/events/WorldChamp1908.pgn) | World Championship 1908 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1909.pgn`](https://www.pgnmentor.com/events/WorldChamp1909.pgn) | World Championship 1909 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1910a.pgn`](https://www.pgnmentor.com/events/WorldChamp1910a.pgn) | World Championship A 1910 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1910b.pgn`](https://www.pgnmentor.com/events/WorldChamp1910b.pgn) | World Championship B 1910 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1921.pgn`](https://www.pgnmentor.com/events/WorldChamp1921.pgn) | World Championship 1921 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1927.pgn`](https://www.pgnmentor.com/events/WorldChamp1927.pgn) | World Championship 1927 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1929.pgn`](https://www.pgnmentor.com/events/WorldChamp1929.pgn) | World Championship 1929 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1934.pgn`](https://www.pgnmentor.com/events/WorldChamp1934.pgn) | World Championship 1934 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1935.pgn`](https://www.pgnmentor.com/events/WorldChamp1935.pgn) | World Championship 1935 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1937.pgn`](https://www.pgnmentor.com/events/WorldChamp1937.pgn) | World Championship 1937 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1948.pgn`](https://www.pgnmentor.com/events/WorldChamp1948.pgn) | World Championship 1948 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1951.pgn`](https://www.pgnmentor.com/events/WorldChamp1951.pgn) | World Championship 1951 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1954.pgn`](https://www.pgnmentor.com/events/WorldChamp1954.pgn) | World Championship 1954 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1957.pgn`](https://www.pgnmentor.com/events/WorldChamp1957.pgn) | World Championship 1957 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1958.pgn`](https://www.pgnmentor.com/events/WorldChamp1958.pgn) | World Championship 1958 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1960.pgn`](https://www.pgnmentor.com/events/WorldChamp1960.pgn) | World Championship 1960 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1961.pgn`](https://www.pgnmentor.com/events/WorldChamp1961.pgn) | World Championship 1961 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1963.pgn`](https://www.pgnmentor.com/events/WorldChamp1963.pgn) | World Championship 1963 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1966.pgn`](https://www.pgnmentor.com/events/WorldChamp1966.pgn) | World Championship 1966 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1969.pgn`](https://www.pgnmentor.com/events/WorldChamp1969.pgn) | World Championship 1969 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1972.pgn`](https://www.pgnmentor.com/events/WorldChamp1972.pgn) | World Championship 1972 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1978.pgn`](https://www.pgnmentor.com/events/WorldChamp1978.pgn) | World Championship 1978 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1981.pgn`](https://www.pgnmentor.com/events/WorldChamp1981.pgn) | World Championship 1981 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1984.pgn`](https://www.pgnmentor.com/events/WorldChamp1984.pgn) | World Championship 1984 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1985.pgn`](https://www.pgnmentor.com/events/WorldChamp1985.pgn) | World Championship 1985 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1986.pgn`](https://www.pgnmentor.com/events/WorldChamp1986.pgn) | World Championship 1986 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1987.pgn`](https://www.pgnmentor.com/events/WorldChamp1987.pgn) | World Championship 1987 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp1990.pgn`](https://www.pgnmentor.com/events/WorldChamp1990.pgn) | World Championship 1990 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp2000.pgn`](https://www.pgnmentor.com/events/WorldChamp2000.pgn) | World Championship 2000 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp2004.pgn`](https://www.pgnmentor.com/events/WorldChamp2004.pgn) | World Championship 2004 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp2006.pgn`](https://www.pgnmentor.com/events/WorldChamp2006.pgn) | World Championship 2006 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp2007.pgn`](https://www.pgnmentor.com/events/WorldChamp2007.pgn) | World Championship 2007 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp2008.pgn`](https://www.pgnmentor.com/events/WorldChamp2008.pgn) | World Championship 2008 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp2010.pgn`](https://www.pgnmentor.com/events/WorldChamp2010.pgn) | World Championship 2010 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp2012.pgn`](https://www.pgnmentor.com/events/WorldChamp2012.pgn) | World Championship 2012 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp2013.pgn`](https://www.pgnmentor.com/events/WorldChamp2013.pgn) | World Championship 2013 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp2014.pgn`](https://www.pgnmentor.com/events/WorldChamp2014.pgn) | World Championship 2014 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp2016.pgn`](https://www.pgnmentor.com/events/WorldChamp2016.pgn) | World Championship 2016 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp2018.pgn`](https://www.pgnmentor.com/events/WorldChamp2018.pgn) | World Championship 2018 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp2021.pgn`](https://www.pgnmentor.com/events/WorldChamp2021.pgn) | World Championship 2021 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp2023.pgn`](https://www.pgnmentor.com/events/WorldChamp2023.pgn) | World Championship 2023 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldChamp2024.pgn`](https://www.pgnmentor.com/events/WorldChamp2024.pgn) | World Championship 2024 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldCup2005.pgn`](https://www.pgnmentor.com/events/WorldCup2005.pgn) | World Cup 2005 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldCup2007.pgn`](https://www.pgnmentor.com/events/WorldCup2007.pgn) | World Cup 2007 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldCup2009.pgn`](https://www.pgnmentor.com/events/WorldCup2009.pgn) | World Cup 2009 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldCup2011.pgn`](https://www.pgnmentor.com/events/WorldCup2011.pgn) | World Cup 2011 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldCup2013.pgn`](https://www.pgnmentor.com/events/WorldCup2013.pgn) | World Cup 2013 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldCup2015.pgn`](https://www.pgnmentor.com/events/WorldCup2015.pgn) | World Cup 2015 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldCup2021.pgn`](https://www.pgnmentor.com/events/WorldCup2021.pgn) | World Cup 2021 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/WorldCup2023.pgn`](https://www.pgnmentor.com/events/WorldCup2023.pgn) | World Cup 2023 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Yerevan1965.pgn`](https://www.pgnmentor.com/events/Yerevan1965.pgn) | Yerevan 1965 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Zagreb1965.pgn`](https://www.pgnmentor.com/events/Zagreb1965.pgn) | Zagreb 1965 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Zagreb2019.pgn`](https://www.pgnmentor.com/events/Zagreb2019.pgn) | Zagreb 2019 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Zandvoort1936.pgn`](https://www.pgnmentor.com/events/Zandvoort1936.pgn) | Zandvoort 1936 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Zug2013.pgn`](https://www.pgnmentor.com/events/Zug2013.pgn) | Zug GP 2013 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Zurich1934.pgn`](https://www.pgnmentor.com/events/Zurich1934.pgn) | Zurich 1934 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Zurich2014.pgn`](https://www.pgnmentor.com/events/Zurich2014.pgn) | Zurich 2014 |
| [PGN Mentor](https://www.pgnmentor.com/) | Events | [`events/Zurich2015.pgn`](https://www.pgnmentor.com/events/Zurich2015.pgn) | Zurich 2015 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Alekhine2Nc3-d5.zip`](https://www.pgnmentor.com/openings/Alekhine2Nc3-d5.zip) | Alekhine, 2.Nc3 d5 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Alekhine4Pawns.zip`](https://www.pgnmentor.com/openings/Alekhine4Pawns.zip) | Alekhine, Four Pawns Attack |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/AlekhineExchange.zip`](https://www.pgnmentor.com/openings/AlekhineExchange.zip) | Alekhine, Exchange |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/AlekhineModern.zip`](https://www.pgnmentor.com/openings/AlekhineModern.zip) | Alekhine, Modern |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/AlekhineOther3.zip`](https://www.pgnmentor.com/openings/AlekhineOther3.zip) | Alekhine, Other 3rd moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/BenkoGambit.zip`](https://www.pgnmentor.com/openings/BenkoGambit.zip) | Benko (Volga) Gambit |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Bird.zip`](https://www.pgnmentor.com/openings/Bird.zip) | Bird |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/BishopsOpening.zip`](https://www.pgnmentor.com/openings/BishopsOpening.zip) | Bishop's Opening |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/BlackKnightTango.zip`](https://www.pgnmentor.com/openings/BlackKnightTango.zip) | Black Knights Tango |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Bogo4Bd2.zip`](https://www.pgnmentor.com/openings/Bogo4Bd2.zip) | Bogo-Indian, 4.Bd2 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Bogo4Nbd2.zip`](https://www.pgnmentor.com/openings/Bogo4Nbd2.zip) | Bogo-Indian, 4.Nbd2 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/BudapestGambit.zip`](https://www.pgnmentor.com/openings/BudapestGambit.zip) | Budapest Gambit |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Caro-Kann2c4.zip`](https://www.pgnmentor.com/openings/Caro-Kann2c4.zip) | Caro-Kann, 2.c4 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Caro-Kann2Knight.zip`](https://www.pgnmentor.com/openings/Caro-Kann2Knight.zip) | Caro-Kann, Two Knights |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Caro-Kann4Nd7.zip`](https://www.pgnmentor.com/openings/Caro-Kann4Nd7.zip) | Caro-Kann, 4...Nd7 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Caro-Kann4Nf6.zip`](https://www.pgnmentor.com/openings/Caro-Kann4Nf6.zip) | Caro-Kann, 4...Nf6 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Caro-KannAdv.zip`](https://www.pgnmentor.com/openings/Caro-KannAdv.zip) | Caro-Kann, Advance |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Caro-KannClassic.zip`](https://www.pgnmentor.com/openings/Caro-KannClassic.zip) | Caro-Kann, Classical |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Caro-KannEx.zip`](https://www.pgnmentor.com/openings/Caro-KannEx.zip) | Caro-Kann, Exchange |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Caro-KannPan-Bot.zip`](https://www.pgnmentor.com/openings/Caro-KannPan-Bot.zip) | Caro-Kann Panov-Botvinnik Attack |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Catalan3Bb4.zip`](https://www.pgnmentor.com/openings/Catalan3Bb4.zip) | Catalan, 3...Bb4 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Catalan3c5.zip`](https://www.pgnmentor.com/openings/Catalan3c5.zip) | Catalan, 3...c5 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/CatalanClosed.zip`](https://www.pgnmentor.com/openings/CatalanClosed.zip) | Catalan, Closed |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/CatalanOpen.zip`](https://www.pgnmentor.com/openings/CatalanOpen.zip) | Catalan, Open |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/CenterGame-Danish.zip`](https://www.pgnmentor.com/openings/CenterGame-Danish.zip) | Center Game and Danish Gambit |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Colle.zip`](https://www.pgnmentor.com/openings/Colle.zip) | Colle System |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/CzechBenoni.zip`](https://www.pgnmentor.com/openings/CzechBenoni.zip) | Czech Benoni |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Dunst.zip`](https://www.pgnmentor.com/openings/Dunst.zip) | Dunst |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Dutch3Nc3.zip`](https://www.pgnmentor.com/openings/Dutch3Nc3.zip) | Dutch, 3.Nc3 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/DutchClassical.zip`](https://www.pgnmentor.com/openings/DutchClassical.zip) | Dutch, Classical |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/DutchLeningrad.zip`](https://www.pgnmentor.com/openings/DutchLeningrad.zip) | Dutch, Leningrad |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/DutchOther.zip`](https://www.pgnmentor.com/openings/DutchOther.zip) | Dutch, Other |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/English1b6.zip`](https://www.pgnmentor.com/openings/English1b6.zip) | English, 1...b6 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/English1c6.zip`](https://www.pgnmentor.com/openings/English1c6.zip) | English, 1...c6 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/English1e6-2Nc3-d5.zip`](https://www.pgnmentor.com/openings/English1e6-2Nc3-d5.zip) | English, Symmetrical 1...e6, 2.Nc3 d5 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/English1e6-2Nf3-d5.zip`](https://www.pgnmentor.com/openings/English1e6-2Nf3-d5.zip) | English, Symmetrical 1...e6, 2.Nf3 d5 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/English1e6Main.zip`](https://www.pgnmentor.com/openings/English1e6Main.zip) | English, 1...e6, Main Line |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/English1f5.zip`](https://www.pgnmentor.com/openings/English1f5.zip) | English, 1...f5 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/English1g6.zip`](https://www.pgnmentor.com/openings/English1g6.zip) | English, 1...g6 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/English1Nf6-2g3.zip`](https://www.pgnmentor.com/openings/English1Nf6-2g3.zip) | English, 1...Nf6, 2.g3 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/English1Nf6-2Nc3.zip`](https://www.pgnmentor.com/openings/English1Nf6-2Nc3.zip) | English, 1...Nf6, 2.Nc3 Anglo-Indian |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/English1Nf6-2Nf3.zip`](https://www.pgnmentor.com/openings/English1Nf6-2Nf3.zip) | English, 1...Nf6, 2.Nf3 Anglo-Indian |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/EnglishFlohr-Mikenas.zip`](https://www.pgnmentor.com/openings/EnglishFlohr-Mikenas.zip) | English, Flohr-Mikenas |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/EnglishSicRev2g3.zip`](https://www.pgnmentor.com/openings/EnglishSicRev2g3.zip) | English, Sicilian Reversed, 2.g3 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/EnglishSicRev4Knights.zip`](https://www.pgnmentor.com/openings/EnglishSicRev4Knights.zip) | English, Sicilian Reversed Four Knights |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/EnglishSicRevBremen.zip`](https://www.pgnmentor.com/openings/EnglishSicRevBremen.zip) | English, Sicilian Reversed Bremen |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/EnglishSicRevClosed.zip`](https://www.pgnmentor.com/openings/EnglishSicRevClosed.zip) | English, Sicilian Reversed Closed |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/EnglishSicRevOtherB2.zip`](https://www.pgnmentor.com/openings/EnglishSicRevOtherB2.zip) | English, Sicilian Reversed Other Black 2nd moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/EnglishSym3d4.zip`](https://www.pgnmentor.com/openings/EnglishSym3d4.zip) | English, Symmetrical, 3.d4 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/EnglishSymFourKnights.zip`](https://www.pgnmentor.com/openings/EnglishSymFourKnights.zip) | English, Symmetrical Four Knights |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/EnglishSymHedgehog.zip`](https://www.pgnmentor.com/openings/EnglishSymHedgehog.zip) | English, Symmetrical, Hedgehog |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/EnglishSymMain.zip`](https://www.pgnmentor.com/openings/EnglishSymMain.zip) | English, Symmetrical, Main Line |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/EnglishSymOtherB3.zip`](https://www.pgnmentor.com/openings/EnglishSymOtherB3.zip) | English, Symmetrical Other Black 3rd moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/EngSymDoubleFianchetto.zip`](https://www.pgnmentor.com/openings/EngSymDoubleFianchetto.zip) | English, Symmetrical Double Fianchetto |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/FourKnights.zip`](https://www.pgnmentor.com/openings/FourKnights.zip) | Four Knights |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/FrenchAdvance.zip`](https://www.pgnmentor.com/openings/FrenchAdvance.zip) | French, Advance |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/FrenchBurn.zip`](https://www.pgnmentor.com/openings/FrenchBurn.zip) | French, Burn |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/FrenchClassical.zip`](https://www.pgnmentor.com/openings/FrenchClassical.zip) | French, Classical |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/FrenchExchange.zip`](https://www.pgnmentor.com/openings/FrenchExchange.zip) | French, Exchange |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/FrenchKIA.zip`](https://www.pgnmentor.com/openings/FrenchKIA.zip) | French, King's Indian Attack |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/FrenchMacCutcheon.zip`](https://www.pgnmentor.com/openings/FrenchMacCutcheon.zip) | French, MacCutcheon |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/FrenchOther2.zip`](https://www.pgnmentor.com/openings/FrenchOther2.zip) | French, Other 2nd moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/FrenchRubinstein.zip`](https://www.pgnmentor.com/openings/FrenchRubinstein.zip) | French, Rubinstein |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/FrenchSchlechter.zip`](https://www.pgnmentor.com/openings/FrenchSchlechter.zip) | French, Schlechter |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/FrenchSteinitz.zip`](https://www.pgnmentor.com/openings/FrenchSteinitz.zip) | French, Steinitz |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/FrTarrasch3c5.zip`](https://www.pgnmentor.com/openings/FrTarrasch3c5.zip) | French, Tarrasch, 3...c5 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/FrTarrasch3Nf6.zip`](https://www.pgnmentor.com/openings/FrTarrasch3Nf6.zip) | French, Tarrasch, 3...Nf6 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/FrTarraschOther3.zip`](https://www.pgnmentor.com/openings/FrTarraschOther3.zip) | French, Tarrasch Other 3rd moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/FrWinawerMain.zip`](https://www.pgnmentor.com/openings/FrWinawerMain.zip) | French, Winawer, Main Line |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/FrWinawerOtherB4.zip`](https://www.pgnmentor.com/openings/FrWinawerOtherB4.zip) | French, Winawer Other Black 4th moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/FrWinawerOtherW4.zip`](https://www.pgnmentor.com/openings/FrWinawerOtherW4.zip) | French, Winawer Other White 4th moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/GiuocoPiano.zip`](https://www.pgnmentor.com/openings/GiuocoPiano.zip) | Giuoco Piano (Italian Game) |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/GoringGambit.zip`](https://www.pgnmentor.com/openings/GoringGambit.zip) | Goring Gambit |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Grunfeld4Nf3.zip`](https://www.pgnmentor.com/openings/Grunfeld4Nf3.zip) | Grunfeld, 4.Nf3 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/GrunfeldExchange.zip`](https://www.pgnmentor.com/openings/GrunfeldExchange.zip) | Grunfeld, Exchange |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/GrunfeldFianchetto.zip`](https://www.pgnmentor.com/openings/GrunfeldFianchetto.zip) | Grunfeld, Fianchetto |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/GrunfeldOther.zip`](https://www.pgnmentor.com/openings/GrunfeldOther.zip) | Grunfeld, Other |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Hodgson.zip`](https://www.pgnmentor.com/openings/Hodgson.zip) | Hogdson Attack |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Hungarian.zip`](https://www.pgnmentor.com/openings/Hungarian.zip) | Hungarian |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/KID4pawns.zip`](https://www.pgnmentor.com/openings/KID4pawns.zip) | King's Indian, 4 Pawns Attack |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/KIDAverbakh.zip`](https://www.pgnmentor.com/openings/KIDAverbakh.zip) | King's Indian, Averbakh |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/KIDClassical.zip`](https://www.pgnmentor.com/openings/KIDClassical.zip) | King's Indian, Classical Main Line |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/KIDFianchetto.zip`](https://www.pgnmentor.com/openings/KIDFianchetto.zip) | King's Indian, Fianchetto |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/KIDOther56.zip`](https://www.pgnmentor.com/openings/KIDOther56.zip) | King's Indian, Classical Other 5th and 6th moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/KIDOther7.zip`](https://www.pgnmentor.com/openings/KIDOther7.zip) | King's Indian, Classical Other 7th moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/KIDPetrosian.zip`](https://www.pgnmentor.com/openings/KIDPetrosian.zip) | King's Indian, Classical Petrosian |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/KIDSaemisch.zip`](https://www.pgnmentor.com/openings/KIDSaemisch.zip) | King's Indian, Saemisch |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/KingsGambit.zip`](https://www.pgnmentor.com/openings/KingsGambit.zip) | King's Gambit |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Latvian-Elephant.zip`](https://www.pgnmentor.com/openings/Latvian-Elephant.zip) | Latvian Gambit and Elephant Gambit |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/London2e6.zip`](https://www.pgnmentor.com/openings/London2e6.zip) | London System, 2...e6 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/London2g6.zip`](https://www.pgnmentor.com/openings/London2g6.zip) | London System, 2...g6 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Modern.zip`](https://www.pgnmentor.com/openings/Modern.zip) | Modern |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Modern3Nc3-c6.zip`](https://www.pgnmentor.com/openings/Modern3Nc3-c6.zip) | Modern, 3.Nc3 c6 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Modern3Nc3-d6.zip`](https://www.pgnmentor.com/openings/Modern3Nc3-d6.zip) | Modern, 3.Nc3 d6 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Modern3Nc3Other.zip`](https://www.pgnmentor.com/openings/Modern3Nc3Other.zip) | Modern, 3.Nc3 Other |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Modern3Nf3.zip`](https://www.pgnmentor.com/openings/Modern3Nf3.zip) | Modern, 3.Nf3 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/ModernBenoni6e4.zip`](https://www.pgnmentor.com/openings/ModernBenoni6e4.zip) | Modern Benoni, 6.e4 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/ModernBenoni6Nf3.zip`](https://www.pgnmentor.com/openings/ModernBenoni6Nf3.zip) | Modern Benoni, 6.Nf3 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/ModernOther3.zip`](https://www.pgnmentor.com/openings/ModernOther3.zip) | Modern, Other 3rd moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Nimzo4f3.zip`](https://www.pgnmentor.com/openings/Nimzo4f3.zip) | Nimzo-Indian, 4.f3 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Nimzo4Nf3.zip`](https://www.pgnmentor.com/openings/Nimzo4Nf3.zip) | Nimzo-Indian, 4.Nf3 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/NimzoCl4c5.zip`](https://www.pgnmentor.com/openings/NimzoCl4c5.zip) | Nimzo-Indian, Classical, 4...c5 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/NimzoCl4O-O.zip`](https://www.pgnmentor.com/openings/NimzoCl4O-O.zip) | Nimzo-Indian, Classical, 4...O-O |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/NimzoClOther.zip`](https://www.pgnmentor.com/openings/NimzoClOther.zip) | Nimzo-Indian, Classical, Other |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/NimzoDefense.zip`](https://www.pgnmentor.com/openings/NimzoDefense.zip) | Nimzowitsch Defense |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/NimzoLeningrad.zip`](https://www.pgnmentor.com/openings/NimzoLeningrad.zip) | Nimzo-Indian, Leningrad |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/NimzoOther4.zip`](https://www.pgnmentor.com/openings/NimzoOther4.zip) | Nimzo-Indian, Other 4th moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/NimzoRub4c5.zip`](https://www.pgnmentor.com/openings/NimzoRub4c5.zip) | Nimzo-Indian, Rubinstein, 4...c5 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/NimzoRub4O-O.zip`](https://www.pgnmentor.com/openings/NimzoRub4O-O.zip) | Nimzo-Indian, Rubinstein, 4...O-O |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/NimzoRubOther.zip`](https://www.pgnmentor.com/openings/NimzoRubOther.zip) | Nimzo-Indian, Rubinstein, Other |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/NimzoSaemisch.zip`](https://www.pgnmentor.com/openings/NimzoSaemisch.zip) | Nimzo-Indian, Saemisch |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Nimzowitsch-Larsen.zip`](https://www.pgnmentor.com/openings/Nimzowitsch-Larsen.zip) | Nimzowitsch-Larsen |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/OldIndian.zip`](https://www.pgnmentor.com/openings/OldIndian.zip) | Old Indian |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/OwenDefense.zip`](https://www.pgnmentor.com/openings/OwenDefense.zip) | Owen Defense |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/PetroffMain.zip`](https://www.pgnmentor.com/openings/PetroffMain.zip) | Petroff, Main Line |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/PetroffOther3.zip`](https://www.pgnmentor.com/openings/PetroffOther3.zip) | Petroff, Other 3rd moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Philidor.zip`](https://www.pgnmentor.com/openings/Philidor.zip) | Philidor |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/PircAustrian.zip`](https://www.pgnmentor.com/openings/PircAustrian.zip) | Pirc, Austrian Attack |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/PircClassical.zip`](https://www.pgnmentor.com/openings/PircClassical.zip) | Pirc, Classical |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/PircOtherBlack3.zip`](https://www.pgnmentor.com/openings/PircOtherBlack3.zip) | Pirc, Other Black 3rd moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/PircOtherWhite3.zip`](https://www.pgnmentor.com/openings/PircOtherWhite3.zip) | Pirc, Other White 3rd moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/PircOtherWhite4.zip`](https://www.pgnmentor.com/openings/PircOtherWhite4.zip) | Pirc, Other White 4th moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Ponziani.zip`](https://www.pgnmentor.com/openings/Ponziani.zip) | Ponziani |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/QG-Albin.zip`](https://www.pgnmentor.com/openings/QG-Albin.zip) | Queen's Gambit Albin Counter-Gambit |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/QG-Chigorin.zip`](https://www.pgnmentor.com/openings/QG-Chigorin.zip) | Queen's Gambit, Chigorin |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/QGA3e4.zip`](https://www.pgnmentor.com/openings/QGA3e4.zip) | Queen's Gambit Accepted, 3.e4 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/QGAMain.zip`](https://www.pgnmentor.com/openings/QGAMain.zip) | Queen's Gambit Accepted Main Line |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/QGAOther3.zip`](https://www.pgnmentor.com/openings/QGAOther3.zip) | Queen's Gambit Accepted Other 3rd moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/QGAOther4.zip`](https://www.pgnmentor.com/openings/QGAOther4.zip) | Queen's Gambit Accepted Other 4th moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/QGD5Bf4.zip`](https://www.pgnmentor.com/openings/QGD5Bf4.zip) | Queen's Gambit Declined, 5.Bf4 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/QGDExchange.zip`](https://www.pgnmentor.com/openings/QGDExchange.zip) | Queen's Gambit Declined Exchange |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/QGDOrthoMain.zip`](https://www.pgnmentor.com/openings/QGDOrthoMain.zip) | Queen's Gambit Declined Orthodox, Main Line |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/QGDOrthoOther4.zip`](https://www.pgnmentor.com/openings/QGDOrthoOther4.zip) | Queen's Gambit Declined Orthodox, Other 4th moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/QGDOther34.zip`](https://www.pgnmentor.com/openings/QGDOther34.zip) | Queen's Gambit Declined Other 3rd and 4th moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/QGDTarrasch.zip`](https://www.pgnmentor.com/openings/QGDTarrasch.zip) | Queen's Gambit Declined Tarrasch |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/QGSym-Baltic.zip`](https://www.pgnmentor.com/openings/QGSym-Baltic.zip) | Queen's Gambit Symmetrical and Baltic |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/QID4a3.zip`](https://www.pgnmentor.com/openings/QID4a3.zip) | Queen's Indian, 4.a3 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/QID4e3.zip`](https://www.pgnmentor.com/openings/QID4e3.zip) | Queen's Indian, 4.e3 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/QID4g3-Ba6.zip`](https://www.pgnmentor.com/openings/QID4g3-Ba6.zip) | Queen's Indian, 4.g3 Ba6 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/QID4g3Other.zip`](https://www.pgnmentor.com/openings/QID4g3Other.zip) | Queen's Indian, 4.g3 Other |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/QID4Nc3.zip`](https://www.pgnmentor.com/openings/QID4Nc3.zip) | Queen's Indian, 4.Nc3 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/QIDOther.zip`](https://www.pgnmentor.com/openings/QIDOther.zip) | Queen's Indian, Other |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Reti2b3.zip`](https://www.pgnmentor.com/openings/Reti2b3.zip) | Reti, 2.b3 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Reti2c4.zip`](https://www.pgnmentor.com/openings/Reti2c4.zip) | Reti, 2.c4 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/RetiKIA.zip`](https://www.pgnmentor.com/openings/RetiKIA.zip) | Reti, King's Indian Attack |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/RuyLopezAntiMarshall.zip`](https://www.pgnmentor.com/openings/RuyLopezAntiMarshall.zip) | Ruy Lopez (Spanish) Anti-Marshall |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/RuyLopezArchangelsk.zip`](https://www.pgnmentor.com/openings/RuyLopezArchangelsk.zip) | Ruy Lopez (Spanish) Archangelsk |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/RuyLopezBerlin.zip`](https://www.pgnmentor.com/openings/RuyLopezBerlin.zip) | Ruy Lopez (Spanish), Berlin |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/RuyLopezBreyer.zip`](https://www.pgnmentor.com/openings/RuyLopezBreyer.zip) | Ruy Lopez (Spanish), Breyer |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/RuyLopezChigorin.zip`](https://www.pgnmentor.com/openings/RuyLopezChigorin.zip) | Ruy Lopez (Spanish) Chigorin (Main Line) |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/RuyLopezClassical.zip`](https://www.pgnmentor.com/openings/RuyLopezClassical.zip) | Ruy Lopez (Spanish), Classical |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/RuyLopezExchange.zip`](https://www.pgnmentor.com/openings/RuyLopezExchange.zip) | Ruy Lopez (Spanish), Exchange |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/RuyLopezFlohr-Zaitsev.zip`](https://www.pgnmentor.com/openings/RuyLopezFlohr-Zaitsev.zip) | Ruy Lopez (Spanish) Flohr-Zaitsev |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/RuyLopezKar-Smy-Khol.zip`](https://www.pgnmentor.com/openings/RuyLopezKar-Smy-Khol.zip) | Ruy Lopez (Spanish) Karpov, Smyslov and Kholmov |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/RuyLopezMarshall.zip`](https://www.pgnmentor.com/openings/RuyLopezMarshall.zip) | Ruy Lopez (Spanish) Marshall Attack |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/RuyLopezModSteinitz.zip`](https://www.pgnmentor.com/openings/RuyLopezModSteinitz.zip) | Ruy Lopez (Spanish) Modern Steinitz |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/RuyLopezOpen.zip`](https://www.pgnmentor.com/openings/RuyLopezOpen.zip) | Ruy Lopez (Spanish), Open |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/RuyLopezOther3.zip`](https://www.pgnmentor.com/openings/RuyLopezOther3.zip) | Ruy Lopez (Spanish) Other 3rd moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/RuyLopezOther5.zip`](https://www.pgnmentor.com/openings/RuyLopezOther5.zip) | Ruy Lopez (Spanish) Other 5th moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/RuyLopezOther6.zip`](https://www.pgnmentor.com/openings/RuyLopezOther6.zip) | Ruy Lopez (Spanish) Other 6th moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/RuyLopezOther9.zip`](https://www.pgnmentor.com/openings/RuyLopezOther9.zip) | Ruy Lopez (Spanish) Other 9th moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/RuyLopezSchliemann.zip`](https://www.pgnmentor.com/openings/RuyLopezSchliemann.zip) | Ruy Lopez (Spanish) Schliemann |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/RuyMoeller-SteinDef.zip`](https://www.pgnmentor.com/openings/RuyMoeller-SteinDef.zip) | Ruy Lopez (Spanish) Moeller and Steinitz Deferred |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Scand2Nf6-3d4.zip`](https://www.pgnmentor.com/openings/Scand2Nf6-3d4.zip) | Scandinavian, 2...Nf6 3.d4 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Scand2Nf6Other.zip`](https://www.pgnmentor.com/openings/Scand2Nf6Other.zip) | Scandinavian, 2...Nf6 Other |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Scand2Qxd5-3Qa5.zip`](https://www.pgnmentor.com/openings/Scand2Qxd5-3Qa5.zip) | Scandinavian, 2...Qxd5, 3...Qa5 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Scand3Qd6-Qd8.zip`](https://www.pgnmentor.com/openings/Scand3Qd6-Qd8.zip) | Scandinavian, 2...Qxd5 3...Qd6 and 3...Qd8 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Scotch4Bc5.zip`](https://www.pgnmentor.com/openings/Scotch4Bc5.zip) | Scotch, 4...Bc5 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Scotch4Nf6.zip`](https://www.pgnmentor.com/openings/Scotch4Nf6.zip) | Scotch, 4...Nf6 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/ScotchGambit.zip`](https://www.pgnmentor.com/openings/ScotchGambit.zip) | Scotch Gambit |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/ScotchOther4.zip`](https://www.pgnmentor.com/openings/ScotchOther4.zip) | Scotch, Other 4th moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SemiBenoni.zip`](https://www.pgnmentor.com/openings/SemiBenoni.zip) | Semi-Benoni |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SemiSlavBotvinnik.zip`](https://www.pgnmentor.com/openings/SemiSlavBotvinnik.zip) | Queen's Gambit Declined Semi-Slav, Botvinnik |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SemiSlavMeran.zip`](https://www.pgnmentor.com/openings/SemiSlavMeran.zip) | Queen's Gambit Declined Semi-Slav, Meran and Anti-Meran |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SemiSlavOther5.zip`](https://www.pgnmentor.com/openings/SemiSlavOther5.zip) | Queen's Gambit Declined Semi-Slav, Other 5th moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SemiTarr5e3-Nc6.zip`](https://www.pgnmentor.com/openings/SemiTarr5e3-Nc6.zip) | Queen's Gambit Declined Semi-Tarrasch, 5.e3 Nc6 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SemiTarraschMain.zip`](https://www.pgnmentor.com/openings/SemiTarraschMain.zip) | Queen's Gambit Declined Semi-Tarrasch, Main Line |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Sic2Nc6-4Qc7-4Qb6.zip`](https://www.pgnmentor.com/openings/Sic2Nc6-4Qc7-4Qb6.zip) | Sicilian, 2...Nc6 4...Qc7 and 4...Qb6 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicDragon6Be2-6Bc4.zip`](https://www.pgnmentor.com/openings/SicDragon6Be2-6Bc4.zip) | Sicilian, Dragon 6.Be2 and 6.Bc4 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Sicilian2d6-4Qxd4.zip`](https://www.pgnmentor.com/openings/Sicilian2d6-4Qxd4.zip) | Sicilian, 2...d6, 4.Qxd4 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Sicilian2f4.zip`](https://www.pgnmentor.com/openings/Sicilian2f4.zip) | Sicilian, 2.f4 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Sicilian2Nc3-d6.zip`](https://www.pgnmentor.com/openings/Sicilian2Nc3-d6.zip) | Sicilian, 2.Nc2 d6 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Sicilian2Nc3-e6.zip`](https://www.pgnmentor.com/openings/Sicilian2Nc3-e6.zip) | Sicilian, 2.Nc2 e6 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Sicilian2Nc6Other5.zip`](https://www.pgnmentor.com/openings/Sicilian2Nc6Other5.zip) | Sicilian, 2...Nc6, Other 5th moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Sicilian2Nf3Other2.zip`](https://www.pgnmentor.com/openings/Sicilian2Nf3Other2.zip) | Sicilian, 2.Nf3, Other 2nd moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianAccelDragon.zip`](https://www.pgnmentor.com/openings/SicilianAccelDragon.zip) | Sicilian, Accelerated Dragon |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianAlapin2d5.zip`](https://www.pgnmentor.com/openings/SicilianAlapin2d5.zip) | Sicilian, Alapin, 2...d5 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianAlapin2Nf6.zip`](https://www.pgnmentor.com/openings/SicilianAlapin2Nf6.zip) | Sicilian, Alapin, 2...Nf6 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianAlapinOther2.zip`](https://www.pgnmentor.com/openings/SicilianAlapinOther2.zip) | Sicilian, Alapin, Other 2nd moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianClassicalOther6.zip`](https://www.pgnmentor.com/openings/SicilianClassicalOther6.zip) | Sicilian, Classical Other 6th moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianClassicalSozin.zip`](https://www.pgnmentor.com/openings/SicilianClassicalSozin.zip) | Sicilian, Classical, Sozin |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianClosedMain.zip`](https://www.pgnmentor.com/openings/SicilianClosedMain.zip) | Sicilian, Closed, Main Line |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianClosedOther3.zip`](https://www.pgnmentor.com/openings/SicilianClosedOther3.zip) | Sicilian, Closed Other 3rd moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianDragonOther6.zip`](https://www.pgnmentor.com/openings/SicilianDragonOther6.zip) | Sicilian, Dragon Other 6th moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianDragonYugoslav.zip`](https://www.pgnmentor.com/openings/SicilianDragonYugoslav.zip) | Sicilian, Dragon Yugoslav Attack |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianGrandPrix.zip`](https://www.pgnmentor.com/openings/SicilianGrandPrix.zip) | Sicilian, Grand Prix Attack |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianKan5Bd3.zip`](https://www.pgnmentor.com/openings/SicilianKan5Bd3.zip) | Sicilian, Kan (Paulsen), 5.Bd3 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianKan5c4.zip`](https://www.pgnmentor.com/openings/SicilianKan5c4.zip) | Sicilian, Kan (Paulsen), 5.c4 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianKan5Nc3.zip`](https://www.pgnmentor.com/openings/SicilianKan5Nc3.zip) | Sicilian, Kan (Paulsen), 5.Nc3 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianKanOther5.zip`](https://www.pgnmentor.com/openings/SicilianKanOther5.zip) | Sicilian, Kan (Paulsen) Other 5th moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianLowenthal.zip`](https://www.pgnmentor.com/openings/SicilianLowenthal.zip) | Sicilian, Lowenthal |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianMisc2.zip`](https://www.pgnmentor.com/openings/SicilianMisc2.zip) | Sicilian Miscellaneous 2nd moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianMoscow.zip`](https://www.pgnmentor.com/openings/SicilianMoscow.zip) | Sicilian, Moscow Variation |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianNajdorf6a4.zip`](https://www.pgnmentor.com/openings/SicilianNajdorf6a4.zip) | Sicilian, Najdorf, 6.a4 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianNajdorf6Bc4.zip`](https://www.pgnmentor.com/openings/SicilianNajdorf6Bc4.zip) | Sicilian, Najdorf 6.Bc4 (Fischer-Sozin) |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianNajdorf6Be2.zip`](https://www.pgnmentor.com/openings/SicilianNajdorf6Be2.zip) | Sicilian, Najdorf, 6.Be2 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianNajdorf6Be3.zip`](https://www.pgnmentor.com/openings/SicilianNajdorf6Be3.zip) | Sicilian, Najdorf, 6.Be3 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianNajdorf6Bg5.zip`](https://www.pgnmentor.com/openings/SicilianNajdorf6Bg5.zip) | Sicilian, Najdorf 6.Bg5 (Main Line) |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianNajdorf6f3.zip`](https://www.pgnmentor.com/openings/SicilianNajdorf6f3.zip) | Sicilian, Najdorf, 6.f3 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianNajdorf6f4.zip`](https://www.pgnmentor.com/openings/SicilianNajdorf6f4.zip) | Sicilian, Najdorf, 6.f4 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianNajdorf6g3.zip`](https://www.pgnmentor.com/openings/SicilianNajdorf6g3.zip) | Sicilian, Najdorf, 6.g3 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianRichter-Rauzer.zip`](https://www.pgnmentor.com/openings/SicilianRichter-Rauzer.zip) | Sicilian, Classical Richter-Rauzer |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianRossolimo.zip`](https://www.pgnmentor.com/openings/SicilianRossolimo.zip) | Sicilian, Rossolimo |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianScheveningen.zip`](https://www.pgnmentor.com/openings/SicilianScheveningen.zip) | Sicilian, Scheveningen |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianSmith-Morra.zip`](https://www.pgnmentor.com/openings/SicilianSmith-Morra.zip) | Sicilian, Smith-Morra Gambit |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianSveshnikov.zip`](https://www.pgnmentor.com/openings/SicilianSveshnikov.zip) | Sicilian, Sveshnikov (Pelican) |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianTaimanov5Nb5.zip`](https://www.pgnmentor.com/openings/SicilianTaimanov5Nb5.zip) | Sicilian, Taimanov, 5.Nb5 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianTaimanovMain.zip`](https://www.pgnmentor.com/openings/SicilianTaimanovMain.zip) | Sicilian, Taimanov, Main Line |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SicilianTaimanovOther5.zip`](https://www.pgnmentor.com/openings/SicilianTaimanovOther5.zip) | Sicilian, Taimanov Other 5th moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Slav4a6.zip`](https://www.pgnmentor.com/openings/Slav4a6.zip) | Queen's Gambit, Slav, 4...a6 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SlavExchange.zip`](https://www.pgnmentor.com/openings/SlavExchange.zip) | Queen's Gambit, Slav, Exchange |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SlavMain.zip`](https://www.pgnmentor.com/openings/SlavMain.zip) | Queen's Gambit, Slav, Main Line |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SlavOther34.zip`](https://www.pgnmentor.com/openings/SlavOther34.zip) | Queen's Gambit, Slav Other 3rd and 4th moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/SlavOther5.zip`](https://www.pgnmentor.com/openings/SlavOther5.zip) | Queen's Gambit, Slav Other 5th moves |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Sokolsky.zip`](https://www.pgnmentor.com/openings/Sokolsky.zip) | Sokolsky |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/ThreeKnights.zip`](https://www.pgnmentor.com/openings/ThreeKnights.zip) | Three Knights |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Torre2e6.zip`](https://www.pgnmentor.com/openings/Torre2e6.zip) | Torre, 2...e6 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Torre2g6.zip`](https://www.pgnmentor.com/openings/Torre2g6.zip) | Torre, 2...g6 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Trompowsky2e6.zip`](https://www.pgnmentor.com/openings/Trompowsky2e6.zip) | Trompowsky, 2...e6 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Trompowsky2Ne4.zip`](https://www.pgnmentor.com/openings/Trompowsky2Ne4.zip) | Trompowsky, 2...Ne4 |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/TrompowskyOther.zip`](https://www.pgnmentor.com/openings/TrompowskyOther.zip) | Trompowsky, Other |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/TwoKnights.zip`](https://www.pgnmentor.com/openings/TwoKnights.zip) | Two Knights |
| [PGN Mentor](https://www.pgnmentor.com/) | Openings | [`openings/Vienna.zip`](https://www.pgnmentor.com/openings/Vienna.zip) | Vienna |
<!-- /sources -->

## Counting Again

A fresh clone reproduces every count on this page by running `mise run data:fetch` and `mise run data:index`, then `mise run docs:render`, and the counts on [Game Lengths](lengths.md) come from the same index.

[^edwards1994b]: Edwards, Steven J., coordinator. 1994. "Standard: Portable Game Notation Specification and Implementation Guide," Section 9.1.2, Tags: WhiteElo, BlackElo. <https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm#c9.1.2>

[^fide2024]: International Chess Federation. 2024. "FIDE Title Regulations Effective from 1 January 2024," Section 1.5.3. <https://handbook.fide.com/chapter/B012024>

[^edwards1994]: Edwards, Steven J., coordinator. 1994. "Standard: Portable Game Notation Specification and Implementation Guide," Section 8.1.1, Seven Tag Roster. <https://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm>
