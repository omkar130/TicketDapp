import React, { useState, useEffect, useContext } from 'react';
import { Card, Button, Container, Row, Col, Badge, Alert } from 'react-bootstrap';
import { Web3Context } from '../context/Web3Context';
import Web3 from 'web3';

const EventsList = () => {
    const { contract, account, web3 } = useContext(Web3Context);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [purchaseLoading, setPurchaseLoading] = useState({});

    const fetchEvents = async () => {
        try {
            let currentEventId = 1;
            const eventsData = [];

            while (true) {
                try {
                    const event = await contract.methods.events(currentEventId).call();
                    if (event.exists) {
                        eventsData.push({
                            ...event,
                            id: currentEventId,
                            formattedDate: new Date(parseInt(event.date) * 1000).toLocaleString()
                        });
                        currentEventId++;
                    } else {
                        break;
                    }
                } catch (err) {
                    break;
                }
            }

            setEvents(eventsData);
        } catch (error) {
            setError('Failed to load events');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (contract) {
            fetchEvents();
        }
    }, [contract]);

    const purchaseTicket = async (eventId, price) => {
        setPurchaseLoading(prev => ({ ...prev, [eventId]: true }));
        try {
            await contract.methods.purchaseTicket(eventId)
                .send({
                    from: account,
                    value: price
                });
            await fetchEvents(); // Refresh events after purchase
        } catch (error) {
            setError('Failed to purchase ticket');
            console.error(error);
        } finally {
            setPurchaseLoading(prev => ({ ...prev, [eventId]: false }));
        }
    };

    if (loading) return <div className="text-center mt-5">Loading events...</div>;

    return (
        <Container className="mt-4">
            <h2 className="mb-4">Available Events</h2>
            {error && <Alert variant="danger">{error}</Alert>}

            {events.length === 0 ? (
                <Alert variant="info">No events available.</Alert>
            ) : (
                <Row xs={1} md={2} lg={3} className="g-4">
                    {events.map(event => (
                        <Col key={event.id}>
                            <Card>
                                <Card.Body>
                                    <Card.Title>{event.name}</Card.Title>
                                    <Card.Text>
                                        <strong>Venue:</strong> {event.venue}<br />
                                        <strong>Date:</strong> {event.formattedDate}<br />
                                        <strong>Price:</strong> {Web3.utils.fromWei(event.ticketPrice, 'ether')} ETH<br />
                                        <strong>Available:</strong>{' '}
                                        <Badge bg={parseInt(event.ticketsSold) < parseInt(event.totalTickets) ? 'success' : 'danger'}>
                                            {parseInt(event.totalTickets) - parseInt(event.ticketsSold)} / {event.totalTickets}
                                        </Badge>
                                    </Card.Text>
                                    <Button
                                        variant="primary"
                                        disabled={
                                            parseInt(event.ticketsSold) >= parseInt(event.totalTickets) ||
                                            new Date(parseInt(event.date) * 1000) < new Date() ||
                                            purchaseLoading[event.id]
                                        }
                                        onClick={() => purchaseTicket(event.id, event.ticketPrice)}
                                    >
                                        {purchaseLoading[event.id] ? 'Purchasing...' : 'Purchase Ticket'}
                                    </Button>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </Container>
    );
};

export default EventsList; 