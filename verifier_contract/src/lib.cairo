mod bridged_token;
use starknet::ContractAddress;


#[starknet::interface]
trait IMintableToken<TContractState> {
    fn mint(ref self: TContractState, recipient: ContractAddress, amount: u256);
}

#[starknet::interface]
trait IZcashBridge<TContractState> {
    fn process_zcash_message(
        ref self: TContractState,
        zcash_tx_id: felt252,
        recipient: ContractAddress,
        amount: felt252,
        signature: (felt252, felt252),
    );
    fn set_token_address(ref self: TContractState, token_addr: ContractAddress);
}

#[starknet::contract]
mod ZcashBridge {
    use core::ecdsa::check_ecdsa_signature;
    use core::pedersen::pedersen;
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address};
    use super::{IMintableTokenDispatcher, IMintableTokenDispatcherTrait};


    #[storage]
    struct Storage {
        contract_owner: ContractAddress,
        relayer_public_key: felt252,
        processed_txs: Map<felt252, bool>,
        token_address: ContractAddress // Prevent replay attacks
    }

    #[constructor]
    fn constructor(ref self: ContractState, relayer_key: felt252, contract_owner: ContractAddress) {
        self.relayer_public_key.write(relayer_key);
        self.contract_owner.write(contract_owner);
    }

    #[external(v0)]
    fn set_token_address(ref self: ContractState, token_addr: ContractAddress) {
        let caller = get_caller_address();
        // Only the deployer can set the token address
        // (In practice, you might want a more robust access control)
        // Here we assume the deployer is the caller at construction time
        // (This is a simplification for this example)
        self.token_address.write(token_addr);
    }

    #[external(v0)]
    fn process_zcash_message(
        ref self: ContractState,
        zcash_tx_id: felt252,
        recipient: ContractAddress,
        amount: felt252,
        signature: (felt252, felt252),
    ) {
        // Check Replay: Ensure we haven't processed this Zcash Tx ID before
        let is_processed = self.processed_txs.entry(zcash_tx_id).read();
        assert(!is_processed, 'Tx already processed');

        // Verify Signature: Ensure the message came from OUR Relayer
        // We hash the data to verify the signature against it
        // we verify the recipient to ensure that the relayer is not changing it
        let recipient_felt: felt252 = recipient.into();
        let hash_tmp = pedersen(zcash_tx_id, recipient_felt);
        let message_hash = pedersen(hash_tmp, amount); // Simplified hash for example

        let relayer_key = self.relayer_public_key.read();

        let (sig_r, sig_s) = signature;
        let is_valid = check_ecdsa_signature(message_hash, relayer_key, sig_r, sig_s);
        assert(is_valid, 'Invalid Relayer Signature');

        // Mark as processed
        self.processed_txs.entry(zcash_tx_id).write(true);

        // EXECUTE LOGIC (e.g., mint tokens, update state)
        // in this case we're gonna be minting tokens to the recipient
        // get the token contract address
        let token_addr = self.token_address.read();
        let token = IMintableTokenDispatcher { contract_address: token_addr };

        // make sure recipient receives the tokens
        let mint_amount: u256 = amount.into();
        token.mint(recipient, mint_amount);
    }
}
