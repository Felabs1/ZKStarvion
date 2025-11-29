#[starknet::interface]
trait IZcashBridge<TContractState> {
    fn process_zcash_message(
        ref self: TContractState,
        zcash_tx_id: felt252,
        payload: felt252,
        signature: (felt252, felt252),
    );
}

#[starknet::contract]
mod ZcashBridge {
    use core::ecdsa::check_ecdsa_signature;
    use core::pedersen::pedersen;
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };


    #[storage]
    struct Storage {
        relayer_public_key: felt252,
        processed_txs: Map<felt252, bool> // Prevent replay attacks
    }

    #[constructor]
    fn constructor(ref self: ContractState, relayer_key: felt252) {
        self.relayer_public_key.write(relayer_key);
    }

    #[external(v0)]
    fn process_zcash_message(
        ref self: ContractState,
        zcash_tx_id: felt252,
        payload: felt252,
        signature: (felt252, felt252),
    ) {
        // 1. Check Replay: Ensure we haven't processed this Zcash Tx ID before
        let is_processed = self.processed_txs.entry(zcash_tx_id).read();
        assert(!is_processed, 'Tx already processed');

        // 2. Verify Signature: Ensure the message came from OUR Relayer
        let relayer_key = self.relayer_public_key.read();

        // We hash the data to verify the signature against it
        let message_hash = pedersen(zcash_tx_id, payload); // Simplified hash for example

        let (sig_r, sig_s) = signature;
        let is_valid = check_ecdsa_signature(message_hash, relayer_key, sig_r, sig_s);
        assert(is_valid, 'Invalid Relayer Signature');

        // 3. Mark as processed
        self.processed_txs.entry(zcash_tx_id).write(true);
        // 4. EXECUTE LOGIC (e.g., mint tokens, update state)
    // ... your logic here ...
    }
}
