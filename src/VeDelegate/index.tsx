import { APP_DESCRIPTION, APP_TITLE } from '~/config';
import { useWallet, useConnex } from '@vechain/dapp-kit-react';
import { useVeDelegate } from '~/modules/veDelegate/useVeDelegate';

export default function VeDelegate() {
    const { account } = useWallet()
    const connex = useConnex()
    const pool = useVeDelegate()

    const handleDeposit = async () => {
        const clauses = await pool.buildDepositClauses({
            b3tr: pool.accountBalance.b3tr,
            vot3: pool.accountBalance.vot3
        })

        await connex.vendor.sign('tx', clauses).comment('Deposit VeBetterDAO Tokens').request()

        // handle transaction and then you can optionally refetch
        await connex.thor.ticker().next()
        pool.refetch()
    }

    const handleWithdraw = async () => {
        if (!account) { return }

        const clauses = await pool.buildWithdrawClauses({
            b3tr: pool.balance.availableB3tr,
            vot3: pool.balance.availableVot3,
            recipient: account,
        })

        await connex.vendor.sign('tx', clauses).comment('Withdraw VeBetterDAO Tokens').request()

        // handle transaction and then you can optionally refetch
        await connex.thor.ticker().next()
        pool.refetch()
    }

    if (!account) { return 'Please connect your wallet to continue.' }

    return (
        <div className='space-y-12 max-w-lg'>
            <div className='space-y-4'>
                <div className='text-xl font-semibold'>{APP_TITLE}</div>
                <p>{APP_DESCRIPTION}</p>
            </div>

            {(pool.accountBalance.b3trAsNumber + pool.accountBalance.vot3AsNumber) > 0 && (
                <div className='space-y-4'>
                    <div>
                        You have not activated all your B3TR tokens.
                    </div>

                    <div className='font-mono text-xs'>
                        You have {pool.accountBalance.b3trAsNumber} B3TR and {pool.accountBalance.vot3AsNumber} VOT3
                    </div>

                    <button
                        className='w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                        onClick={handleDeposit}
                    >
                        Activate Support & Staking
                    </button>
                </div>
            )}

            {(pool.balance.b3trAsNumber + pool.balance.vot3AsNumber) > 0 && (
                <div className='space-y-8'>
                    <div>
                        You have activated your B3TR tokens yet.
                    </div>


                    <div className='font-mono text-xs'>
                        You have {pool.balance.availableB3trAsNumber} B3TR and {pool.balance.availableVot3AsNumber} VOT3 in your Staking Account.
                    </div>

                    <div className='font-mono text-xs'>
                        Smart Account Address: {pool.address}<br />
                        Token Id: {pool.tokenId}
                    </div>


                    <button
                        className='w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                        onClick={handleWithdraw}
                    >
                        Deactivate Support & Staking
                    </button>
                </div>
            )}

            <div>

            </div>

            {/* {Boolean(error) && <ErrorMessage>{error}</ErrorMessage>} */}
        </div>
    )
}