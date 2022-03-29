const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Lottery Manager test", function () {
  let lotteryManager;

  beforeEach(async function () {
    const LotteryManager = await ethers.getContractFactory("LotteryManager");
    lotteryManager = await LotteryManager.deploy();
    await lotteryManager.deployed();
  });

  it("The number of lotteries should be 0", async function () {
    expect(Object.entries(await lotteryManager.getLotteries()).length).to.equal(
      0
    );
  });

  it("A lottery should be created and appear in array", async function () {
    const createLotteryTx = await lotteryManager.createLottery(
      "lottery_1",
      1667253600,
      100000000,
      3
    );
    await createLotteryTx.wait();
    expect(Object.entries(await lotteryManager.getLotteries()).length).to.equal(
      1
    );
  });

  it("A second lottery should be created", async function () {
    const createLotteryTx = await lotteryManager.createLottery(
      "lottery_1",
      1667253600,
      100000000,
      3
    );
    await createLotteryTx.wait();

    const createLotteryTx2 = await lotteryManager.createLottery(
      "lottery_1",
      1667253600,
      100000000,
      3
    );
    await createLotteryTx2.wait();

    expect(Object.entries(await lotteryManager.getLotteries()).length).to.equal(
      2
    );
  });

  it("Should be reverted because the string with the name of the lottery is empty", async function () {
    await expect(
      lotteryManager.createLottery("", 1667253600, 100000000, 3)
    ).to.be.revertedWith("The lottery must have a name!");
  });

  it("Should be reverted because the end date for the lottery isn't a date in the future (>block.timestamp)", async function () {
    await expect(
      lotteryManager.createLottery("lottery_1", 10000, 100000000, 3)
    ).to.be.revertedWith("End date should be in the future!");
  });

  it("Should be reverted because the price of entrance is 0", async function () {
    await expect(
      lotteryManager.createLottery("lottery_1", 1667253600, 0, 3)
    ).to.be.revertedWith("The price of entrance should be not 0!");
  });

  it("Should be reverted because the number of entries per user is 0", async function () {
    await expect(
      lotteryManager.createLottery("lottery_1", 1667253600, 100000000, 0)
    ).to.be.revertedWith("The user should be entrance at least once!");
  });
});

describe("Lottery test", function () {
  let lottery;
  let lotteryOwner;
  let user1;
  let user2;
  let lotteryName = "lottery_1";
  let endDate = 1667253600;
  let priceOfEntrance = 100000000;
  let numberOfEntries = 2;

  beforeEach(async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Lottery = await ethers.getContractFactory("Lottery");
    lottery = await Lottery.deploy(
      owner.address,
      lotteryName,
      endDate,
      priceOfEntrance,
      numberOfEntries
    );
    await lottery.deployed();
    lotteryOwner = owner;
    user1 = addr1;
    user2 = addr2;
  });

  it("The number of players should be 0", async function () {
    expect(Object.entries(await lottery.getPlayers()).length).to.equal(0);
  });

  it("The number of entrace per user should be 0", async function () {
    expect(
      await lottery.getNumberOfEntriesForUser(
        "0x238523c12943F662CEE571FFe46C28C62B9f4272"
      )
    ).to.equal(0);
    expect(
      await lottery.getNumberOfEntriesForUser(
        "0x541519cf0943b2Efba75841E73aacD3A4a1752FF"
      )
    ).to.equal(0);
  });

  it("Can't get the winners addresses because the lottery hasn't ended ", async function () {
    await expect(lottery.getWinner1()).to.be.revertedWith(
      "The lottery hasn't ended!"
    );
    await expect(lottery.getWinner2()).to.be.revertedWith(
      "The lottery hasn't ended!"
    );
  });

  it("Only the owner can pick the winners", async function () {
    // this method can be called only by the owner of the contract
    await expect(lottery.pickWinner()).to.be.revertedWith("");
  });

  it("Can't choose the winners because the balance is 0(no one participated)", async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [lotteryOwner.address],
    });

    await expect(lottery.connect(lotteryOwner).pickWinner()).to.be.revertedWith(
      "Balance is 0"
    );

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [lotteryOwner.address],
    });
  });

  it("Can't pick the winner because he is already chosen", async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [lotteryOwner.address],
    });

    const enterTx = await lottery.connect(user1).enter(1,{ value: 100000000 });
    await enterTx.wait();
    const enterTx1 = await lottery.connect(user2).enter(1,{ value: 100000000 });
    await enterTx1.wait();

    await lottery.connect(lotteryOwner).pickWinner();
    await expect(lottery.connect(lotteryOwner).pickWinner()).to.be.revertedWith(
      "The lottery has ended!"
    );

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [lotteryOwner.address],
    });
  });

  it("The lottery should pick the winners and get their addresses", async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [lotteryOwner.address],
    });
    //some users enter the lottery
    const enterTx = await lottery.connect(user1).enter(1,{ value: 100000000 });
    await enterTx.wait();
    const enterTx1 = await lottery.connect(user2).enter(1,{ value: 100000000 });
    await enterTx1.wait();
    const enterTx2 = await lottery
      .connect(lotteryOwner)
      .enter(1,{ value: 100000000 });
    await enterTx2.wait();

    //the lottery hasn't ended and owner hasn't withdraw the commission
    expect(
      await lottery.connect(lotteryOwner).getOwnerWithdrawedCommission()
    ).to.equal(false);

    //2 winners are picked
    const pickWinnerTx = await lottery.connect(lotteryOwner).pickWinner();
    await pickWinnerTx.wait();

    //the lottery has ended and owner hasn't withdraw the commission
    expect(
      await lottery.connect(lotteryOwner).getOwnerWithdrawedCommission()
    ).to.equal(false);

    //the owner withdraw his commission
    const withdrawCommissionTx = await lottery
      .connect(lotteryOwner)
      .withdrawCommission();
    await withdrawCommissionTx.wait();

    //2 winners were chosen so we should get their addresses
    expect(await lottery.getWinner1()).to.not.equal("");
    expect(await lottery.getWinner2()).to.not.equal("");

    //test info lottery after has ended
    const lotteryInfo = await lottery.getLotteryInfo();
    expect(lotteryInfo[0]).to.equal(lotteryName);
    expect(lotteryInfo[1]).to.equal(lotteryOwner.address);
    expect(lotteryInfo[3]).to.equal(endDate);
    // end date should be after the start date
    expect(lotteryInfo[3] > lotteryInfo[2]).to.equal(true);
    // picked date should after the end date but not necessarly before the end date
    expect(lotteryInfo[4] > lotteryInfo[2]).to.equal(true);
    expect(lotteryInfo[5]).to.equal(priceOfEntrance);
    expect(lotteryInfo[6]).to.equal(numberOfEntries);
    // the lottery has ended
    expect(lotteryInfo[7]).to.equal(true);

    //the owner withdraw his commission
    expect(await lottery.getOwnerWithdrawedCommission()).to.equal(true);

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [lotteryOwner.address],
    });
  });

  it("Can't withdraw the commission because the lottery has not ended", async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [lotteryOwner.address],
    });

    await expect(
      lottery.connect(lotteryOwner).withdrawCommission()
    ).to.be.revertedWith("Please pick the winner first!");

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [lotteryOwner.address],
    });
  });

  it("Can't withdraw the commission because is already withdrawn", async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [lotteryOwner.address],
    });

    const enterTx = await lottery.connect(user1).enter(1,{ value: 100000000 });
    await enterTx.wait();
    const enterTx1 = await lottery.connect(user2).enter(1,{ value: 100000000 });
    await enterTx1.wait();

    await lottery.connect(lotteryOwner).pickWinner();
    await lottery.connect(lotteryOwner).withdrawCommission();
    expect(
      lottery.connect(lotteryOwner).withdrawCommission()
    ).to.be.revertedWith("You received the commsision");

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [lotteryOwner.address],
    });
  });

  it("The transaction will be reverted because the user sent a lower amount", async function () {
    await expect(lottery.enter(1,{ value: 10000 })).to.be.revertedWith(
      "Incorrect amount!"
    );
  });
  it("The transaction will be reverted because the user sent a bigger amount", async function () {
    await expect(lottery.enter(1,{ value: 100000001 })).to.be.revertedWith(
      "Incorrect amount!"
    );
  });

  it("Get lottery info test right after creation", async function () {
    const lotteryInfo = await lottery.getLotteryInfo();
    expect(lotteryInfo[0]).to.equal(lotteryName);
    expect(lotteryInfo[1]).to.equal(lotteryOwner.address);
    expect(lotteryInfo[3]).to.equal(endDate);
    // end date should be after the start date
    expect(lotteryInfo[3] > lotteryInfo[2]).to.equal(true);
    // picked date should be 0 now
    expect(lotteryInfo[4]).to.equal(0);
    expect(lotteryInfo[5]).to.equal(priceOfEntrance);
    expect(lotteryInfo[6]).to.equal(numberOfEntries);
    // the lottery hasn't ended
    expect(lotteryInfo[7]).to.equal(false);
  });

  it("The user should enter the lottery", async function () {
    const enterTx = await lottery.enter(1,{ value: 100000000 });
    await enterTx.wait();
    expect(Object.entries(await lottery.getPlayers()).length).to.equal(1);
  });

  it("The user can no longer enter because he has the maximum number of entries", async function () {
    const enterTx = await lottery.enter(1,{ value: 100000000 });
    await enterTx.wait();
    const enterTx1 = await lottery.enter(1,{ value: 100000000 });
    await enterTx1.wait();
    

    expect(lottery.enter(1,{ value: 100000000 })).to.be.revertedWith(
      "To many entries"
    );
  });

  it("The number of entiries should be 1", async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [lotteryOwner.address],
    });
    const enterTx = await lottery.enter(1,{ value: 100000000 });
    await enterTx.wait();

    expect(
      await lottery.getNumberOfEntriesForUser(lotteryOwner.address)
    ).to.equal(1);

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [lotteryOwner.address],
    });
  });

  it("The number of entiries should be 2", async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [lotteryOwner.address],
    });
    const enterTx = await lottery.enter(1,{ value: 100000000 });
    await enterTx.wait();

    expect(
      await lottery.getNumberOfEntriesForUser(lotteryOwner.address)
    ).to.equal(1);

    const enterTx1 = await lottery.enter(1,{ value: 100000000 });
    await enterTx1.wait();

    expect(
      await lottery.getNumberOfEntriesForUser(lotteryOwner.address)
    ).to.equal(2);

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [lotteryOwner.address],
    });
  });

  it("Single user should enter the lottery and he should be only one in players array", async function () {
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [lotteryOwner.address],
    });
    const enterTx = await lottery
      .connect(lotteryOwner)
      .enter(1,{ value: 100000000 });
    await enterTx.wait();

    expect(Object.entries(await lottery.getPlayers())).to.eql([
      ["0", lotteryOwner.address.toString()],
    ]);

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [lotteryOwner.address],
    });
  });
});
