A simple web application to convert [poi-viewer](https://github.com/poooi/poi)'s
[Battle Detail](https://github.com/poooi/plugin-battle-detail) data
to [KC3Kai](https://github.com/KC3Kai/KC3Kai)'s
[KanColle Replay](https://github.com/KC3Kai/kancolle-replay) format.


## Change History

- v0.0.1 (2017-08-14)
    - First working version:
        - Importing:
            - Supports copied and pasted poooi/plugin-battle-detail data
            - Supports poooi/plugin-battle-detail GZipped data
        - Exporting:
            - JSON String
            - PNG Steganography similar to KC3Kai's
        - Supported KanColle Replay features:
            - Single-fleet battles
                - Including enemies with combined fleets (e.g. 6-5 boss)
            - Support Expeditions
            - LBAS
            - Fleet details (Single Fleet only)
