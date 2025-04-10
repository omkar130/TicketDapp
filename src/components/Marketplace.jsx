import React, { useState, useEffect, useContext } from 'react';
import { Card, Button, Container, Row, Col, Alert, Badge } from 'react-bootstrap';
import { Web3Context } from '../context/Web3Context';
import Web3 from 'web3';

const Marketplace = () => {
    const { contract, account, web3 } = useContext(Web3Context);
    const [listedTickets, setListedTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [purchaseLoading, setPurchaseLoading] = useState({});

    const fetchListedTickets = async () => {
        if (!contract || !web3) return;

        try {
            // Get total supply of tickets
            const totalSupply = await contract.methods.totalSupply().call();
            const tickets = [];

            // Iterate through all tickets
            for (let i = 0; i < totalSupply; i++) {
                try {
                    // Get token ID
                    const tokenId = await contract.methods.tokenByIndex(i).call();
                    // Get sale information
                    const sale = await contract.methods.ticketSales(tokenId).call();

                    // If ticket is listed for sale
                    if (sale.isListed) {
                        // Get event information
                        const eventId = await contract.methods.ticketToEvent(tokenId).call();
                        const eventDetails = await contract.methods.events(eventId).call();

                        tickets.push({
                            tokenId: tokenId.toString(),
                            eventId: eventId.toString(),
                            event: {
                                name: eventDetails.name,
                                venue: eventDetails.venue,
                                date: eventDetails.date.toString(),
                                ticketPrice: eventDetails.ticketPrice.toString()
                            },
                            sale: {
                                price: sale.price.toString(),
                                seller: sale.seller.toString()
                            }
                        });
                    }
                } catch (err) {
                    console.error('Error processing ticket:', err);
                    continue;
                }
            }

            setListedTickets(tickets);
        } catch (error) {
            console.error('Error fetching tickets:', error);
            setError('Failed to load marketplace tickets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (contract && web3) {
            fetchListedTickets();
        }
    }, [contract, web3]);

    const purchaseListedTicket = async (tokenId, price) => {
        if (!contract || !account) return;

        setPurchaseLoading(prev => ({ ...prev, [tokenId]: true }));
        try {
            await contract.methods.purchaseListedTicket(tokenId)
                .send({
                    from: account,
                    value: price
                });
            await fetchListedTickets();
        } catch (error) {
            setError('Failed to purchase ticket: ' + error.message);
        } finally {
            setPurchaseLoading(prev => ({ ...prev, [tokenId]: false }));
        }
    };

    const formatDate = (timestamp) => {
        try {
            return new Date(Number(timestamp) * 1000).toLocaleString();
        } catch (error) {
            return 'Invalid Date';
        }
    };

    return (
        <Container className="mt-4">
            <h2 className="mb-4">Ticket Marketplace</h2>
            {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Alert variant="info">Loading marketplace tickets...</Alert>
            ) : listedTickets.length === 0 ? (
                <Alert variant="info">No tickets are currently listed for sale.</Alert>
            ) : (
                <Row xs={1} md={2} lg={3} className="g-4">
                    {listedTickets.map(ticket => (
                        <Col key={ticket.tokenId}>
                            <Card className="h-100">
                                <Card.Header>
                                    <Badge bg="info">Ticket #{ticket.tokenId}</Badge>
                                </Card.Header>
                                <Card.Body>
                                    <Card.Title>{ticket.event.name}</Card.Title>
                                    <Card.Text>
                                        <strong>Venue:</strong> {ticket.event.venue}<br />
                                        <strong>Date:</strong> {formatDate(ticket.event.date)}<br />
                                        <strong>Price:</strong>{' '}
                                        <Badge bg="success">
                                            {Web3.utils.fromWei(ticket.sale.price, 'ether')} ETH
                                        </Badge>
                                    </Card.Text>

                                    {Number(ticket.event.date) * 1000 < Date.now() ? (
                                        <Alert variant="warning" className="mb-0">
                                            Event has already occurred
                                        </Alert>
                                    ) : ticket.sale.seller.toLowerCase() === account?.toLowerCase() ? (
                                        <Alert variant="info" className="mb-0">
                                            You are the seller
                                        </Alert>
                                    ) : (
                                        <Button
                                            variant="primary"
                                            className="w-100"
                                            disabled={purchaseLoading[ticket.tokenId]}
                                            onClick={() => purchaseListedTicket(ticket.tokenId, ticket.sale.price)}
                                        >
                                            {purchaseLoading[ticket.tokenId] ?
                                                'Processing Purchase...' :
                                                `Buy for ${Web3.utils.fromWei(ticket.sale.price, 'ether')} ETH`
                                            }
                                        </Button>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </Container>
    );
};

export default Marketplace; 