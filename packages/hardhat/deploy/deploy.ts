import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHEGenerativeArt = await deploy("FHEGenerativeArt", {
    from: deployer,
    log: true,
  });

  console.log(`FHEGenerativeArt contract: `, deployedFHEGenerativeArt.address);
};
export default func;
func.id = "deploy_FHEGenerativeArt"; // id required to prevent reexecution
func.tags = ["FHEGenerativeArt"];
