#[starknet::contract]
mod BridgedToken {
    use core::num::traits::Zero;
    // We use the new Storage system
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address};

    #[storage]
    struct Storage {
        name: felt252,
        symbol: felt252,
        decimals: u8,
        total_supply: u256,
        balances: Map<ContractAddress, u256>,
        allowances: Map<(ContractAddress, ContractAddress), u256>,
        owner: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Transfer: Transfer,
        Approval: Approval,
    }

    #[derive(Drop, starknet::Event)]
    struct Transfer {
        #[key]
        from: ContractAddress,
        #[key]
        to: ContractAddress,
        value: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct Approval {
        #[key]
        owner: ContractAddress,
        #[key]
        spender: ContractAddress,
        value: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.name.write('Bridged Zcash');
        self.symbol.write('BZEC');
        self.decimals.write(18);
        self.owner.write(owner);
    }

    // ==========================================================
    // 🛡️ BRIDGE FUNCTIONS
    // ==========================================================

    #[external(v0)]
    fn mint(ref self: ContractState, recipient: ContractAddress, amount: u256) {
        let caller = get_caller_address();
        assert(caller == self.owner.read(), 'Only Bridge can mint');
        _mint(ref self, recipient, amount);
    }

    #[external(v0)]
    fn burn(ref self: ContractState, amount: u256) {
        let caller = get_caller_address();
        _burn(ref self, caller, amount);
    }

    // ==========================================================
    // 👤 ERC20 STANDARD FUNCTIONS
    // ==========================================================

    #[external(v0)]
    fn name(self: @ContractState) -> felt252 {
        self.name.read()
    }

    #[external(v0)]
    fn symbol(self: @ContractState) -> felt252 {
        self.symbol.read()
    }

    #[external(v0)]
    fn decimals(self: @ContractState) -> u8 {
        self.decimals.read()
    }

    #[external(v0)]
    fn total_supply(self: @ContractState) -> u256 {
        self.total_supply.read()
    }

    #[external(v0)]
    fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
        // FIX: Use .entry(account) before .read()
        self.balances.entry(account).read()
    }

    #[external(v0)]
    fn allowance(self: @ContractState, owner: ContractAddress, spender: ContractAddress) -> u256 {
        // FIX: Use .entry((key, key)) before .read()
        self.allowances.entry((owner, spender)).read()
    }

    #[external(v0)]
    fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
        let sender = get_caller_address();
        _transfer(ref self, sender, recipient, amount);
        true
    }

    #[external(v0)]
    fn transfer_from(
        ref self: ContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256,
    ) -> bool {
        let caller = get_caller_address();

        // FIX: Use .entry(...)
        let current_allowance = self.allowances.entry((sender, caller)).read();
        assert(current_allowance >= amount, 'Insufficient Allowance');

        // FIX: Use .entry(...)
        self.allowances.entry((sender, caller)).write(current_allowance - amount);

        self
            .emit(
                Event::Approval(
                    Approval { owner: sender, spender: caller, value: current_allowance - amount },
                ),
            );

        _transfer(ref self, sender, recipient, amount);
        true
    }

    #[external(v0)]
    fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
        let owner = get_caller_address();
        // FIX: Use .entry(...)
        self.allowances.entry((owner, spender)).write(amount);
        self.emit(Event::Approval(Approval { owner, spender, value: amount }));
        true
    }

    // ==========================================================
    // 🔧 INTERNAL HELPERS
    // ==========================================================

    fn _transfer(
        ref self: ContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256,
    ) {
        assert(!sender.is_zero(), 'Transfer from 0');
        assert(!recipient.is_zero(), 'Transfer to 0');

        // FIX: Use .entry(...)
        let sender_bal = self.balances.entry(sender).read();
        assert(sender_bal >= amount, 'Insufficient Balance');

        // FIX: Use .entry(...)
        self.balances.entry(sender).write(sender_bal - amount);

        let recipient_bal = self.balances.entry(recipient).read();
        self.balances.entry(recipient).write(recipient_bal + amount);

        self.emit(Event::Transfer(Transfer { from: sender, to: recipient, value: amount }));
    }

    fn _mint(ref self: ContractState, recipient: ContractAddress, amount: u256) {
        assert(!recipient.is_zero(), 'Mint to 0');

        let supply = self.total_supply.read();
        self.total_supply.write(supply + amount);

        // FIX: Use .entry(...)
        let balance = self.balances.entry(recipient).read();
        self.balances.entry(recipient).write(balance + amount);

        self.emit(Event::Transfer(Transfer { from: Zero::zero(), to: recipient, value: amount }));
    }

    fn _burn(ref self: ContractState, account: ContractAddress, amount: u256) {
        // FIX: Use .entry(...)
        let balance = self.balances.entry(account).read();
        assert(balance >= amount, 'Burn amount exceeds balance');

        let supply = self.total_supply.read();
        self.total_supply.write(supply - amount);

        // FIX: Use .entry(...)
        self.balances.entry(account).write(balance - amount);

        self.emit(Event::Transfer(Transfer { from: account, to: Zero::zero(), value: amount }));
    }
}
