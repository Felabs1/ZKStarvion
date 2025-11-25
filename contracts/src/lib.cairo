#[starknet::interface]
trait IL2Messenger<TContractState> {
    fn handle_ping(ref self: TContractState, from_address: felt252, value: felt252);
}

#[starknet::contract]
mod L2Messenger {
    use starknet::SyscallResultTrait;
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::syscalls::send_message_to_l1_syscall;

    #[storage]
    struct Storage {}


    #[l1_handler]
    fn handle_ping(ref self: ContractState, from_address: felt252, value: felt252) {
        // Security check: Only allow messages from our specific L1 contract
        let trusted_l1: felt252 = 0xa0C2FE1AE408eA75C2f96B5048E7DAeDA6cBF4A9;
        assert(from_address == trusted_l1, 'Unauthorized L1 sender');

        // Logic: Add 1 to the value and send it back
        let value_to_return = value + 1;

        // Prepare payload for L1
        let mut payload = ArrayTrait::new();
        payload.append(value_to_return);

        // 2. Send "Pong" message hash to L1
        // Note: This does NOT execute on L1 automatically. It just stores the hash.
        send_message_to_l1_syscall(trusted_l1, payload.span()).unwrap_syscall();
    }
}
