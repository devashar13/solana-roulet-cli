const web3 = require("@solana/web3.js");
const inquirer = require("inquirer");
const chalk = require("chalk");
const { getReturnAmount, totalAmtToBePaid, randomNumber } = require("./helper");
const {getWalletBalance,transferSOL,airDropSol}=require("./solana");

const figlet = require("figlet");
const connection = new web3.Connection(
  web3.clusterApiUrl("devnet"),
  "confirmed"
);

const init = () => {
  console.log(
    chalk.green(
      figlet.textSync("SOL Stake", {
        font: "Standard",
        horizontalLayout: "default",
        verticalLayout: "default",
      })
    )
  );
  console.log(chalk.yellow`The max bidding amount is 2.5 SOL here`);
};

// Creeate a user wallet
const userAcc = web3.Keypair.generate();
const userPublicKey = new web3.PublicKey(
  userAcc._keypair.publicKey
).toString();
const userSecretKey = userAcc._keypair.secretKey;

// Create the escrow wallet
const escrowAcc = web3.Keypair.generate();
const escrowPublicKey = new web3.PublicKey(
  escrowAcc._keypair.publicKey
).toString();
const escrowSecretKey = escrowAcc._keypair.secretKey;

// Getting instances of both wallets
const userWallet = web3.Keypair.fromSecretKey(Uint8Array.from(userSecretKey));
const escrowWallet = web3.Keypair.fromSecretKey(
  Uint8Array.from(escrowSecretKey)
);

const askQuestions = () => {
  const questions = [
    {
      name: "SOL",
      type: "number",
      message: "What is the amount of SOL you want to stake?",
    },
    {
      type: "rawlist",
      name: "RATIO",
      message: "What is the ratio of your staking?",
      choices: ["1:1.25", "1:1.5", "1:1.75", "1:2"],
      filter: function (val) {
        const stakeFactor = val.split(":")[1];
        return stakeFactor;
      },
    },
    {
      type: "number",
      name: "RANDOM",
      message: "Guess a random number from 1 to 5 (both 1, 5 included)",
      when: async (val) => {
        if (parseFloat(totalAmtToBePaid(val.SOL)) > 5) {
          console.log(
            chalk.red`You have violated the max stake limit. Stake with smaller amount.`
          );
          return false;
        } else {
          console.log(
            `You need to pay ${chalk.green`${totalAmtToBePaid(
              val.SOL
            )}`} to move forward`
          );
          const userBalance = await getWalletBalance(
            userWallet.publicKey.toString()
          );
          if (userBalance < totalAmtToBePaid(val.SOL)) {
            console.log(
              chalk.red`You don't have enough balance in your wallet`
            );
            return false;
          } else {
            console.log(
              chalk.green`You will get ${getReturnAmount(
                val.SOL,
                parseFloat(val.RATIO)
              )} if guessing the number correctly`
            );
            return true;
          }
        }
      },
    },
  ];

  return inquirer.prompt(questions);
};

const gameExecution = async () => {
  init();
  const generateRandomNumber = randomNumber(1, 5);
  // Filling some sol in user wallet to play
  await airDropSol(userWallet, 2);
  const answer = await askQuestions();

  if (answer.RANDOM) {
    const paymentSignature = await transferSOL(
      userWallet,
      escrowWallet,
      totalAmtToBePaid(answer.SOL)
    );
    console.log(
      `Signature of payment for playing the game`,
      chalk.green`${paymentSignature}`
    );
    if (answer.RANDOM == generateRandomNumber) {
      await airDropSol(
        escrowWallet,
        getReturnAmount(answer.SOL, parseFloat(answer.RATIO))
      );
      const sginPrize = await transferSOL(
        escrowWallet,
        userWallet,
        getReturnAmount(answer.SOL, parseFloat(answer.RATIO))
      );
      console.log(chalk.green`Your guess is absolutely correct`);
      console.log(
        `Here is the price signature `,
        chalk.green`${prizeSignature}`
      );
    } else {
      //better luck next time
      console.log(chalk.yellowBright`Better luck next time`);
    }
  }
};


gameExecution()