import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Menu, Button } from 'react-native-paper';
import axios from 'axios';

const MultiLevelDropdown = () => {
    const [visible, setVisible] = useState(false);
    const [selectedUniversity, setSelectedUniversity] = useState('');
    const [selectedProgram, setSelectedProgram] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [ids, setIds] = useState([]);
    const [universities, setUniversities] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [sections, setSections] = useState([]);

    useEffect(() => {
        const fetchIDs = async () => {
            try {
                const response = await axios.get('http://192.168.146.129:5000/api/schedule/ids');
                setIds(response.data.ids);
                extractUniversities(response.data.ids);
                console.log(ids);
                
            } catch (error) {
                console.error('Error fetching IDs:', error);
            }
        };

        fetchIDs();
    }, []);

    const extractUniversities = (ids) => {
        const uniqueUniversities = Array.from(new Set(ids.map(id => id.split('-')[0])));
        setUniversities(uniqueUniversities);
    };

    useEffect(() => {
        if (selectedUniversity) {
            const filteredPrograms = Array.from(new Set(
                ids.filter(id => id.startsWith(selectedUniversity))
                    .map(id => id.split('-')[1])
            ));
            setPrograms(filteredPrograms);
            setSelectedProgram('');  // Reset lower levels
            setSemesters([]);
            setSections([]);
        }
    }, [selectedUniversity]);

    useEffect(() => {
        if (selectedProgram) {
            const filteredSemesters = Array.from(new Set(
                ids.filter(id => id.startsWith(`${selectedUniversity}-${selectedProgram}`))
                    .map(id => id.split('-')[2])
            ));
            setSemesters(filteredSemesters);
            setSelectedSemester('');  // Reset lower levels
            setSections([]);
        }
    }, [selectedProgram]);

    useEffect(() => {
        if (selectedSemester) {
            const filteredSections = Array.from(new Set(
                ids.filter(id => id.startsWith(`${selectedUniversity}-${selectedProgram}-${selectedSemester}`))
                    .map(id => id.split('-')[3])
            ));
            setSections(filteredSections);
            setSelectedSection('');  // Reset section
        }
    }, [selectedSemester]);

    const resetState = () => {
        setSelectedUniversity('');
        setSelectedProgram('');
        setSelectedSemester('');
        setSelectedSection('');
        setPrograms([]);
        setSemesters([]);
        setSections([]);
    };

    return (
        <View style={styles.container}>
            <Button onPress={() => { setVisible(true); resetState(); }}>Select</Button>
            <Menu className='w-48'
                visible={visible}
                onDismiss={() => setVisible(false)}
                anchor={<Button onPress={() => { setVisible(true); resetState(); }}>Open Menu</Button>}
            >
                {/* <TextInput
                    style={styles.searchInput}
                    placeholder="Search..."
                    value={searchQuery}
                    onChangeText={query => setSearchQuery(query)}
                /> */}
                <View>
                    <Text>University</Text>
                    <FlatList
                        data={universities}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                            <Button onPress={() => {
                                setSelectedUniversity(item);
                            }}>
                                {item}
                            </Button>
                        )}
                    />
                </View>
                {selectedUniversity && (
                    <View>
                        <Text>Program</Text>
                        <FlatList
                            data={programs}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <Button onPress={() => {
                                    setSelectedProgram(item);
                                }}>
                                    {item}
                                </Button>
                            )}
                        />
                    </View>
                )}
                {selectedProgram && (
                    <View>
                        <Text>Semester</Text>
                        <FlatList
                            data={semesters}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <Button onPress={() => {
                                    setSelectedSemester(item);
                                }}>
                                    {item}
                                </Button>
                            )}
                        />
                    </View>
                )}
                {selectedSemester && (
                    <View>
                        <Text>Section</Text>
                        <FlatList
                            data={sections}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <Button onPress={() => {
                                    setSelectedSection(item);
                                    setVisible(false); // Optionally close menu on final selection
                                }}>
                                    {item}
                                </Button>
                            )}
                        />
                    </View>
                )}
            </Menu>
            <Text>Selected University: {selectedUniversity}</Text>
            <Text>Selected Program: {selectedProgram}</Text>
            <Text>Selected Semester: {selectedSemester}</Text>
            <Text>Selected Section: {selectedSection}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20
    },
    searchInput: {
        margin: 10,
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 4,
        padding: 8
    }
});

export default MultiLevelDropdown;