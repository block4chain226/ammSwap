const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const {anyValue} = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const {expect} = require("chai");
const {ethers} = require("hardhat");
const {getContractAddress} = require("@ethersproject/address");

const contractInstance = (adr) => {
    const abi = require("../abis/ECR20.abi.json");
    return new ethers.Contract(adr, abi.abi, ethers.provider);
}

describe("Test", function () {
    async function deploy() {
        const snx = "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F";
        const akro = "0x8Ab7404063Ec4DBcfd4598215992DC3F8EC853d7";
        const owner = "0x51C72848c68a965f66FA7a88855F9f7784502a7F";
        const user = "0x4d6210F7a73C97cB67E8D2050e10B869a5E8c9D6";

        const impersonateUser = await ethers.getImpersonatedSigner(user);
        const impersonateOwner = await ethers.getImpersonatedSigner(owner);

        const snxContract = contractInstance(snx);
        const akroContract = contractInstance(akro);

        const Factory = await ethers.getContractFactory("Factory", impersonateOwner);
        const factory = await Factory.deploy(impersonateOwner);
        await factory.waitForDeployment();

        return {impersonateUser, impersonateOwner, factory, snx, akro, snxContract, akroContract};
    }

    describe("Factory test", () => {
        it("should deploy pair contract with predicted address", async () => {
            const {
                impersonateUser,
                factory,
                snx,
                akro,
                snxContract,
                akroContract
            } = await loadFixture(deploy);
            const transactionCount = await ethers.provider.getTransactionCount(factory.getAddress());
            const futureAddress = getContractAddress({
                from: await factory.getAddress(),
                nonce: transactionCount
            })
            await snxContract.connect(impersonateUser).approve(futureAddress, ethers.parseUnits("1000000000000000000000000000", "wei"));
            await akroContract.connect(impersonateUser).approve(futureAddress, ethers.parseUnits("1000000000000000000000000000", "wei"));
            await factory.connect(impersonateUser).createPair(snx, akro, ethers.parseUnits("1000", "wei"), ethers.parseUnits("1000", "wei"));
            const contract = await ethers.getContractAt("AmmSwap", await factory.contracts(0));
            const balances = await contract.getReservesBalances();
            expect(futureAddress).to.eq(await factory.contracts(0));
            expect(balances.toString()).to.eq([1000, 1000].toString());
        })
    })

});
