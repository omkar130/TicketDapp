import React, { createContext, useState, useEffect } from 'react';
import Web3 from 'web3';
import contractABI from '../ethereum/abi.json';
import contractAddress from '../ethereum/address';

export const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
    const [web3, setWeb3] = useState(null);
    const [contract, setContract] = useState(null);
    const [account, setAccount] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(false);

    const SEPOLIA_CHAIN_ID = '0xaa36a7';

    const checkAndSwitchNetwork = async () => {
        try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (chainId !== SEPOLIA_CHAIN_ID) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: SEPOLIA_CHAIN_ID }],
                    });
                    setIsCorrectNetwork(true);
                    return true;
                } catch (switchError) {
                    if (switchError.code === 4902) {
                        alert('Please add Sepolia network to your MetaMask');
                    }
                    setIsCorrectNetwork(false);
                    return false;
                }
            }
            setIsCorrectNetwork(true);
            return true;
        } catch (error) {
            console.error('Error checking network:', error);
            setIsCorrectNetwork(false);
            return false;
        }
    };

    const checkOwner = async (web3Instance, contractInstance, currentAccount) => {
        try {
            const owner = await contractInstance.methods.owner().call();
            setIsOwner(owner.toLowerCase() === currentAccount.toLowerCase());
        } catch (error) {
            console.error('Error checking owner:', error);
            setIsOwner(false);
        }
    };

    const initializeWeb3 = async () => {
        try {
            const web3Instance = new Web3(window.ethereum);
            const accounts = await web3Instance.eth.getAccounts();

            if (accounts.length > 0) {
                const contractInstance = new web3Instance.eth.Contract(
                    contractABI,
                    contractAddress
                );

                setWeb3(web3Instance);
                setContract(contractInstance);
                setAccount(accounts[0]);
                setIsConnected(true);

                // Check if connected account is owner
                await checkOwner(web3Instance, contractInstance, accounts[0]);

                // Check network after connection
                await checkAndSwitchNetwork();
            }
        } catch (error) {
            console.error('Error initializing web3:', error);
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    const connectWallet = async () => {
        try {
            if (window.ethereum) {
                setIsLoading(true);
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                await initializeWeb3();
            } else {
                alert('Please install MetaMask!');
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Error connecting to MetaMask:', error);
            setIsLoading(false);
        }
    };

    // Check for existing connection on mount
    useEffect(() => {
        const checkConnection = async () => {
            if (window.ethereum) {
                try {
                    const accounts = await window.ethereum.request({
                        method: 'eth_accounts'
                    });

                    if (accounts.length > 0) {
                        await initializeWeb3();
                    } else {
                        setIsLoading(false);
                    }
                } catch (error) {
                    console.error('Error checking existing connection:', error);
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        };

        checkConnection();
    }, []);

    // Monitor network and account changes
    useEffect(() => {
        if (window.ethereum) {
            window.ethereum.on('chainChanged', async (chainId) => {
                setIsCorrectNetwork(chainId === SEPOLIA_CHAIN_ID);
                if (chainId === SEPOLIA_CHAIN_ID && account) {
                    await initializeWeb3();
                }
            });

            window.ethereum.on('accountsChanged', async (accounts) => {
                if (accounts.length > 0) {
                    await initializeWeb3();
                } else {
                    setAccount(null);
                    setIsConnected(false);
                    setIsCorrectNetwork(false);
                }
            });
        }

        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener('chainChanged', () => { });
                window.ethereum.removeListener('accountsChanged', () => { });
            }
        };
    }, [account]);

    return (
        <Web3Context.Provider
            value={{
                web3,
                contract,
                account,
                isConnected,
                isCorrectNetwork,
                isLoading,
                isOwner,
                connectWallet,
                checkAndSwitchNetwork
            }}
        >
            {children}
        </Web3Context.Provider>
    );
}; 