const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const {anyValue} = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const {expect} = require("chai");
const {ethers} = require("hardhat");
const {getContractAddress} = require("@ethersproject/address");

const contractInstance = (adr) => {
    const abi = require("../abis/ERC20.abi.json");
    return new ethers.Contract(adr, abi.abi, ethers.provider);
}

describe("Test", function () {
    async function deploy() {
        const usdc = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
        const zla = "0xfd8971d5E8E1740cE2d0A84095fCA4De729d0c16";
        const weth = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
        const owner = "0x51C72848c68a965f66FA7a88855F9f7784502a7F";
        const user = "0x894D55bE079E7e19fe526Ac22B0786b7afE18E7e";

        const impersonateUser = await ethers.getImpersonatedSigner(user);
        const impersonateOwner = await ethers.getImpersonatedSigner(owner);

        const usdcContract = contractInstance(usdc);
        const wethContract = contractInstance(weth);
        const zlaContract = contractInstance(zla);

        const LpToken = await ethers.getContractFactory("LpToken", impersonateOwner);
        const lpToken = await LpToken.deploy(impersonateOwner);
        await lpToken.waitForDeployment();

        const Factory = await ethers.getContractFactory("Factory", impersonateOwner);
        const factory = await Factory.deploy(impersonateOwner);
        await factory.waitForDeployment();

        const transactionCount = await ethers.provider.getTransactionCount(factory.getAddress());
        const futureAddress = getContractAddress({
            from: await factory.getAddress(),
            nonce: transactionCount
        })

        await usdcContract.connect(impersonateUser).approve(futureAddress, ethers.parseUnits("10000000000", "wei"));
        await wethContract.connect(impersonateUser).approve(futureAddress, ethers.parseUnits("10000000000000000000000000", "wei"));
        await factory.connect(impersonateUser).createPair(usdc, weth, lpToken.getAddress(), ethers.parseUnits("100000000", "wei"),
            ethers.parseUnits("48600000000000000", "wei"));
        const pairContract = await ethers.getContractAt("AmmSwap", futureAddress);

        return {
            impersonateUser,
            futureAddress,
            impersonateOwner,
            factory,
            zlaContract,
            usdc,
            pairContract,
            weth,
            lpToken,
            usdcContract,
            wethContract
        };
    }

    describe("Factory test", () => {
        describe("CreatePair", () => {
            it("should deploy pair contract with predicted address", async () => {
                const {impersonateUser, factory, pairContract, futureAddress, lpToken} = await loadFixture(deploy);
                const balances = await pairContract.getReservesBalances();
                const lpBalance = await lpToken.balanceOf(impersonateUser.address);
                const lp = 48600000000000000 * 100000000;
                expect(lpBalance.toString()).to.eq(Math.floor(Math.sqrt((lp))).toString());
                expect(futureAddress).to.eq(await factory.contracts(0));
                expect(balances.toString()).to.eq([100000000, 48600000000000000].toString());
            })
        })
        describe("AddLiquidity", () => {
            it("user should add liquidity with right ratio", async () => {
                const {
                    impersonateUser,
                    wethContract,
                    usdcContract,
                    futureAddress,
                    pairContract,
                    lpToken
                } = await loadFixture(deploy);
                const usdcWei = 300000000;
                const wethPrice = 2057;
                //x,y - reserves
                //dx,dy - amounts
                //dy = y / x * dx
                await usdcContract.connect(impersonateUser).approve(futureAddress, ethers.parseUnits("1000000000000000", "wei"));
                await wethContract.connect(impersonateUser).approve(futureAddress, ethers.parseUnits("1000000000000000000000000000000", "wei"));
                const reserves = await pairContract.getReservesBalances();
                const amountOne = ethers.toBigInt(reserves[1]) / ethers.toBigInt(reserves[0]) * ethers.toBigInt(usdcWei);
                const lpBefore = await lpToken.balanceOf(impersonateUser.address);
                await pairContract.connect(impersonateUser).addLiquidity(usdcContract.getAddress(), wethContract.getAddress(), ethers.parseUnits("300000000", "wei"),
                    ethers.parseUnits(amountOne.toString(), "wei"));
                const lpAfter = await lpToken.balanceOf(impersonateUser.address);
                const reservesAfter = await pairContract.getReservesBalances();
                expect(reservesAfter > reserves).to.eq(true);
                expect(lpAfter > lpBefore).to.eq(true);
            })
        })
        describe("Swap", () => {
            it("should swap weth to usdc", async () => {
                const {
                    impersonateUser,
                    wethContract,
                    usdcContract,
                    pairContract
                } = await loadFixture(deploy);
                await wethContract.connect(impersonateUser).approve(pairContract.getAddress(), ethers.parseUnits("1000000000000000000000000000000", "wei"));
                const usdcBalBefore = await usdcContract.balanceOf(impersonateUser.address);
                const wethBalBefore = await wethContract.balanceOf(impersonateUser.address);
                const reservesBefore = await pairContract.getReservesBalances();
                await pairContract.connect(impersonateUser).swap(wethContract.getAddress(), ethers.parseUnits("100000000000000000", "wei"))
                const reservesAfter = await pairContract.getReservesBalances();
                const usdcBalAfter = await usdcContract.balanceOf(impersonateUser.address);
                const wethBalAfter = await wethContract.balanceOf(impersonateUser.address);
                expect(usdcBalBefore < usdcBalAfter).to.eq(true);
                expect(wethBalBefore > wethBalAfter).to.eq(true);
                expect(reservesBefore[0] > reservesAfter[0] && reservesBefore[1] < reservesAfter[1]).to.eq(true);
            })

            it("should swap usdc to weth", async () => {
                const {
                    impersonateUser,
                    wethContract,
                    usdcContract,
                    pairContract
                } = await loadFixture(deploy);
                await usdcContract.connect(impersonateUser).approve(pairContract.getAddress(), ethers.parseUnits("1000000000000000000000000000000", "wei"));
                const usdcBalBefore = await usdcContract.balanceOf(impersonateUser.address);
                const wethBalBefore = await wethContract.balanceOf(impersonateUser.address);
                const reservesBefore = await pairContract.getReservesBalances();
                await pairContract.connect(impersonateUser).swap(usdcContract.getAddress(), ethers.parseUnits("100000000", "wei"))
                const reservesAfter = await pairContract.getReservesBalances();
                const usdcBalAfter = await usdcContract.balanceOf(impersonateUser.address);
                const wethBalAfter = await wethContract.balanceOf(impersonateUser.address);
                expect(usdcBalBefore > usdcBalAfter).to.eq(true);
                expect(wethBalBefore < wethBalAfter).to.eq(true);
                expect(reservesBefore[0] < reservesAfter[0] && reservesBefore[1] > reservesAfter[1]).to.eq(true);
            })

            it("should revert with zla tokenIn", async () => {
                const {
                    impersonateUser,
                    zlaContract,
                    pairContract
                } = await loadFixture(deploy);
                await zlaContract.connect(impersonateUser).approve(pairContract.getAddress(), ethers.parseUnits("1000000000000000000000000000000", "wei"));
                await expect(pairContract.connect(impersonateUser).swap(zlaContract.getAddress(), ethers.parseUnits("100000000", "wei"))).to.be.revertedWith("tokenIn is not right");
            })
        })
        describe("RemoveLiquidity", () => {
            it("user should remove all liquidity and get weth and usdc", async () => {
                const {
                    impersonateUser,
                    wethContract,
                    usdcContract,
                    pairContract,
                    lpToken
                } = await loadFixture(deploy);
                await usdcContract.connect(impersonateUser).approve(pairContract.getAddress(), ethers.parseUnits("1000000000000000", "wei"));
                await wethContract.connect(impersonateUser).approve(pairContract.getAddress(), ethers.parseUnits("1000000000000000000000000000000", "wei"));
                const reserves = await pairContract.getReservesBalances();
                const amountOne = ethers.toBigInt(reserves[1]) / ethers.toBigInt(reserves[0]) * ethers.toBigInt("300000000");
                await pairContract.connect(impersonateUser).addLiquidity(usdcContract.getAddress(), wethContract.getAddress(), ethers.parseUnits("300000000", "wei"),
                    ethers.parseUnits(amountOne.toString(), "wei"));
                const totalLp = await lpToken.totalSupply();
                const wethAfterAddLiquidity = await wethContract.balanceOf(impersonateUser.address);
                const lpAfterA = await lpToken.balanceOf(impersonateUser.address);
                const usdcAfterAdd = await usdcContract.balanceOf(impersonateUser.address);
                const reservesAfterAdd = await pairContract.getReservesBalances();
                await pairContract.connect(impersonateUser).removeLiquidity(lpAfterA);
                const lpAfterR = await lpToken.balanceOf(impersonateUser.address);
                const wethAfterRemove = await wethContract.balanceOf(impersonateUser.address);
                const usdcAfterRemove = await usdcContract.balanceOf(impersonateUser.address);
                const reservesAfterRemove = await pairContract.getReservesBalances();
                const totalLpR = await lpToken.totalSupply();
                expect(wethAfterRemove > wethAfterAddLiquidity).to.eq(true);
                expect(usdcAfterRemove > usdcAfterAdd).to.eq(true);
                expect(lpAfterA > lpAfterR).to.eq(true);
                expect(reservesAfterAdd > reservesAfterRemove).to.eq(true);
                expect(totalLp > totalLpR && totalLpR == 0).to.eq(true);
            })
        })
    })

});
