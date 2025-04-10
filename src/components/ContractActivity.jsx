import React, { useState, useEffect, useContext } from 'react';
import { Container, Table, Badge, Alert, Button, Spinner, Pagination } from 'react-bootstrap';
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
    const [totalPages, setTotalPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10; // Number of items per page

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
            setLoading(true);

            // First, get total number of events
            const countResponse = await fetch(
                `https://api-sepolia.etherscan.io/api?module=logs&action=getLogs` +
                `&fromBlock=0` +
                `&toBlock=latest` +
                `&address=${contractAddress}` +
                `&apikey=${ETHERSCAN_API_KEY}`
            );

            const countData = await countResponse.json();

            if (countData.status === '1') {
                const totalEvents = countData.result.length;
                const calculatedTotalPages = Math.ceil(totalEvents / ITEMS_PER_PAGE);
                setTotalPages(calculatedTotalPages);
            }

            // Then fetch the specific page
            const response = await fetch(
                `https://api-sepolia.etherscan.io/api?module=logs&action=getLogs` +
                `&fromBlock=0` +
                `&toBlock=latest` +
                `&address=${contractAddress}` +
                `&page=${pageNumber}` +
                `&offset=${ITEMS_PER_PAGE}` +
                `&apikey=${ETHERSCAN_API_KEY}`
            );

            const data = await response.json();
            console.log("Page data:", data); // Debug log

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

                setActivities(newActivities);
                setCurrentPage(pageNumber);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error fetching activities:', error);
            setError('Failed to fetch contract activities: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Handle page change
    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        fetchActivities(pageNumber);
        window.scrollTo(0, 0); // Scroll to top when page changes
    };

    // Generate pagination items
    const renderPaginationItems = () => {
        let items = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            // Show all pages if total pages are less than max visible
            for (let number = 1; number <= totalPages; number++) {
                items.push(
                    <Pagination.Item
                        key={number}
                        active={number === currentPage}
                        onClick={() => handlePageChange(number)}
                    >
                        {number}
                    </Pagination.Item>
                );
            }
        } else {
            // Always show first page
            items.push(
                <Pagination.Item
                    key={1}
                    active={1 === currentPage}
                    onClick={() => handlePageChange(1)}
                >
                    1
                </Pagination.Item>
            );

            // Calculate middle range
            let startPage = Math.max(2, currentPage - 1);
            let endPage = Math.min(totalPages - 1, currentPage + 1);

            // Add ellipsis after first page if needed
            if (startPage > 2) {
                items.push(<Pagination.Ellipsis key="ellipsis1" />);
            }

            // Add middle pages
            for (let number = startPage; number <= endPage; number++) {
                items.push(
                    <Pagination.Item
                        key={number}
                        active={number === currentPage}
                        onClick={() => handlePageChange(number)}
                    >
                        {number}
                    </Pagination.Item>
                );
            }

            // Add ellipsis before last page if needed
            if (endPage < totalPages - 1) {
                items.push(<Pagination.Ellipsis key="ellipsis2" />);
            }

            // Always show last page
            items.push(
                <Pagination.Item
                    key={totalPages}
                    active={totalPages === currentPage}
                    onClick={() => handlePageChange(totalPages)}
                >
                    {totalPages}
                </Pagination.Item>
            );
        }

        return items;
    };

    useEffect(() => {
        fetchActivities(1);
    }, [contractAddress]);

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

            {loading ? (
                <div className="text-center mt-4">
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </Spinner>
                </div>
            ) : (
                <>
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

                    <div className="d-flex flex-column align-items-center mt-4">
                        <Pagination>
                            <Pagination.First
                                onClick={() => handlePageChange(1)}
                                disabled={currentPage === 1}
                            />
                            <Pagination.Prev
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                            />

                            {renderPaginationItems()}

                            <Pagination.Next
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            />
                            <Pagination.Last
                                onClick={() => handlePageChange(totalPages)}
                                disabled={currentPage === totalPages}
                            />
                        </Pagination>
                        <div className="mt-2 text-muted">
                            Page {currentPage} of {totalPages}
                        </div>
                    </div>
                </>
            )}
        </Container>
    );
};

export default ContractActivity; 