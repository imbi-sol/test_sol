import { 
  Connection, 
  PublicKey, 
  LAMPORTS_PER_SOL, 
  SystemProgram, 
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram
} from '@solana/web3.js';
import { resolve } from '@bonfida/spl-name-service';

// Configuration constants
const IMBIBE_AMOUNT = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL in lamports
const PRIORITY_FEE_MICROLAMPORTS = 20000; // 20,000 microlamports priority fee
const COMPUTE_UNIT_LIMIT = 200000; // Standard compute unit limit

export async function resolveSnsDomain(connection: Connection, domain: string): Promise<PublicKey> {
  try {
    // Remove .sol if present in the domain
    const cleanDomain = domain.replace('.sol', '');
    const owner = await resolve(connection, cleanDomain);
    if (!owner) {
      throw new Error(`Could not resolve SNS domain: ${domain}`);
    }
    return owner;
  } catch (error) {
    console.error('Error resolving SNS domain:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  // Action specification
  const spec = {
    name: "Imbibe",
    description: "Send exactly 0.1 SOL to imbibed.sol with priority fees",
    specification: {
      button: {
        type: "string",
        description: "Button label",
        default: "imbibe"
      }
    }
  };

  try {
    // Initialize connection (use appropriate endpoint based on environment)
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    );

    // Resolve the SNS domain
    const recipientAddress = await resolveSnsDomain(connection, 'imbibed.sol');

    // Create priority fee instruction
    const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: PRIORITY_FEE_MICROLAMPORTS
    });

    // Create compute unit limit instruction
    const computeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: COMPUTE_UNIT_LIMIT
    });

    // Create transfer instruction (we'll use a placeholder sender that will be replaced by the wallet)
    const transferIx = SystemProgram.transfer({
      fromPubkey: new PublicKey('11111111111111111111111111111111'), // Placeholder
      toPubkey: recipientAddress,
      lamports: IMBIBE_AMOUNT
    });

    // Bundle instructions
    const instructions = [
      priorityFeeIx,
      computeUnitLimitIx,
      transferIx
    ];

    // Return the transaction and metadata
    return {
      transaction: instructions,
      metadata: {
        ...spec,
        recipient: recipientAddress.toBase58(),
        amount: "0.1 SOL",
        priorityFee: `${PRIORITY_FEE_MICROLAMPORTS} microlamports`
      }
    };
  } catch (error) {
    console.error('Error creating imbibe transaction:', error);
    throw error;
  }
}
