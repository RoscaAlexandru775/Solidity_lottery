# Basic Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, a sample script that deploys that contract, and an example of a task implementation, which simply lists the available accounts.

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
node scripts/sample-script.js
npx hardhat help
```
npx hardhat run --network rinkeby scripts/sample-script.js
npx hardhat verify  --network rinkeby 0x5f84325a69e5648106cf0dbef71ff628473fb965
npx hardhat verify  --network rinkeby 0xcc854ece574a0a02ea5bb8683ade5a82568cf195 0x238523c12943F662CEE571FFe46C28C62B9f4272 "lottery_2" 1 1 3
