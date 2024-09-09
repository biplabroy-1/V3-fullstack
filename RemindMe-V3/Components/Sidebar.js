import React, { useEffect, useState } from 'react';
import { View, Text, Animated, Easing, Dimensions } from 'react-native';
import { formatAMPM } from './Utils/Date';

const Sidebar = ({ isOpen, onClose }) => {
    const [currentTime, setCurrentTime] = useState(formatAMPM(new Date()));

    // Get screen width
    const { width: screenWidth } = Dimensions.get('window');

    // Animated value for the sidebar's position
    const translateX = React.useRef(new Animated.Value(-screenWidth)).current; // Initial position off-screen

    useEffect(() => {
        Animated.timing(translateX, {
            toValue: isOpen ? 0 : -screenWidth, // 0 when open, -screenWidth when closed
            duration: 400, // Duration of the animation
            easing: Easing.ease,
            useNativeDriver: true,
        }).start();
    }, [isOpen, screenWidth]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(formatAMPM(new Date()));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <Animated.View
            style={{
                transform: [{ translateX }],
                position: 'absolute',
                top: 0,
                height: '100%',
                width: '100%',
                backgroundColor: '#374151', // Darker background for visibility
                padding: 14,
                zIndex: 50,
                justifyContent: 'space-between',
            }}
        >
            <View className='flex-1 mt-12'>
                <Text className='text-3xl text-center text-white border-b-2 border-b-[#E5E7EB] p-4'>{currentTime}</Text>
                <Text className='text-lg text-center my-4 text-white'>Option 2</Text>
                <Text className='text-lg text-center my-4 text-white'>Option 3</Text>
            </View>
        </Animated.View>
    );
};

export default Sidebar;
