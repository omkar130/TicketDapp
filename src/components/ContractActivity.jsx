import React, { useState, useEffect, useContext } from 'react';
import { Container, Table, Badge, Alert, Button, Spinner } from 'react-bootstrap';
import Web3 from 'web3';
import contractABI from '../ethereum/abi.json'; // Import your contract ABI

const ContractActivity = ({ contractAddress }) => {
    console.log(contractAddress);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [eventSignatures, setEventSignatures] = useState({});

    const ETHERSCAN_API_KEY = "4BFYXUAB7K7QYCGHIEPEKUX1H433SEACKG";
    const EVENTS_PER_PAGE = 20;

    // Initialize event signatures from ABI
    useEffect(() => {
        const web3 = new Web3(window.ethereum);
        const signatures = {};

        contractABI.forEach(item => {
            if (item.type === 'event') {
                // Create the event signature string
                const inputs = item.inputs.map(input => input.type).join(',');
                const signatureStr = `${item.name}(${inputs})`;
                // Calculate the hash
                const signatureHash = web3.utils.keccak256(signatureStr);
                signatures[signatureHash] = item.name;

                console.log(`Event: ${item.name}, Signature: ${signatureHash}`); // Debug log
            }
        });

        setEventSignatures(signatures);
    }, []);

    const getEventName = (topics) => {
        // Event signatures from the logs
        const eventSignatures = {
            // Approval
            '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925': 'Approval',

            // ApprovalForAll
            '0x17307eab39ab6187e8899454ad3d59bd9653f200f22892048ca2b59376965c31': 'ApprovalForAll',

            // EventCreated
            '0xbe79be80cd2c221daefdfbef1c6e8ce6543d1fd9d8a9fed8426a521543af5a33': 'EventCreated',

            // OwnershipTransferred
            '0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0': 'OwnershipTransferred',

            // TicketDelisted
            '0x3967925235f70873eabda48c5242393d4d41d99cd105109a90601202792fad50': 'TicketDelisted',

            // TicketListed
            '0x5ddeb20641397a4006800e63273f4f75df6e6964e4456220df00032d3d160da7': 'TicketListed',

            // TicketPurchased
            '0x94c5953e15f54d38b82a662bdd5739fc91af3a23d3ef7e67269dfaeee71a813c': 'TicketPurchased',

            // TicketSold
            '0x44f19a44b8c509adc281ec35927694f6d25e501d0de1764890ab0637b8dcda48': 'TicketSold',

            // Transfer
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef': 'Transfer'
        };
        return eventSignatures[topics[0]] || 'Unknown Event';
    };

    const decodeEventData = (log, eventName) => {
        // Find the event ABI
        const eventAbi = contractABI.find(
            item => item.type === 'event' && item.name === eventName
        );

        if (!eventAbi) return {};

        const web3 = new Web3(window.ethereum);
        try {
            // Create the event object from ABI
            const eventObj = web3.eth.abi.decodeLog(
                eventAbi.inputs,
                log.data,
                log.topics.slice(1) // Remove the event signature topic
            );

            // Convert the decoded data to a plain object
            return Object.keys(eventObj).reduce((acc, key) => {
                if (isNaN(parseInt(key))) { // Skip numeric keys
                    acc[key] = eventObj[key];
                }
                return acc;
            }, {});
        } catch (error) {
            console.error('Error decoding event data:', error);
            return {};
        }
    };

    const fetchActivities = async (pageNumber) => {
        try {
            const response = await fetch(
                `https://api-sepolia.etherscan.io/api?module=logs&action=getLogs` +
                `&fromBlock=0` +
                `&toBlock=latest` +
                `&address=${contractAddress}` +
                `&page=${pageNumber}` +
                `&offset=${EVENTS_PER_PAGE}` +
                `&apikey=${ETHERSCAN_API_KEY}`
            );

            const data = await response.json();
            console.log(data);
            if (data.status === '1') {
                const newActivities = data.result.map(log => {
                    const eventName = getEventName(log.topics);
                    const decodedData = decodeEventData(log, eventName);

                    return {
                        eventName,
                        transactionHash: log.transactionHash,
                        blockNumber: parseInt(log.blockNumber, 16),
                        timestamp: new Date(parseInt(log.timeStamp, 16) * 1000),
                        data: decodedData
                    };
                });

                setActivities(prev =>
                    pageNumber === 1 ? newActivities : [...prev, ...newActivities]
                );
                setHasMore(newActivities.length === EVENTS_PER_PAGE);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            setError('Failed to fetch contract activities: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities(1);
    }, [contractAddress]);

    const loadMore = () => {
        setPage(prev => prev + 1);
        fetchActivities(page + 1);
    };

    const getEventBadgeVariant = (eventName) => {
        const variants = {
            'TicketPurchased': 'dark',
            'TicketListed': 'dark',
            'TicketDelisted': 'dark',
            'TicketSold': 'dark',
            'EventCreated': 'dark'
        };
        return variants[eventName] || 'dark';
    };

    const formatAddress = (address) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    if (loading && page === 1) {
        return (
            <Container className="mt-4 text-center">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </Container>
        );
    }

    return (
        <Container className="mt-4">
            <h2 className="mb-4">Contract Activity</h2>

            {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Table responsive striped hover>
                <thead>
                    <tr>
                        <th>Event</th>
                        <th>Details</th>
                        <th>Transaction</th>
                        <th>Time</th>
                    </tr>
                </thead>
                <tbody>
                    {activities.map((activity, index) => (
                        <tr key={`${activity.transactionHash}-${index}`}>
                            <td>
                                <Badge bg="dark">
                                    {activity.eventName}
                                </Badge>
                            </td>
                            <td>
                                {Object.entries(activity.data).map(([key, value]) => (
                                    <div key={key}>
                                        <strong>{key}:</strong>{' '}
                                        {typeof value === 'string' && value.startsWith('0x')
                                            ? formatAddress(value)
                                            : value.toString()}
                                    </div>
                                ))}
                            </td>
                            <td>
                                <a
                                    href={`https://sepolia.etherscan.io/tx/${activity.transactionHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {formatAddress(activity.transactionHash)}
                                </a>
                            </td>
                            <td>{activity.timestamp.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            {hasMore && (
                <div className="text-center mt-3 mb-4">
                    <Button
                        variant="outline-primary"
                        onClick={loadMore}
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : 'Load More'}
                    </Button>
                </div>
            )}
        </Container>
    );
};

export default ContractActivity; 