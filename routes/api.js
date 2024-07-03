import { useTheme, useFocusEffect } from '@react-navigation/native';
import React, { useRef, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, RefreshControl, BackHandler } from 'react-native';
import Header from '../../layout/Header';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { GlobalStyleSheet } from '../../constants/StyleSheet';
import Cardstyle2 from '../../components/Card/Cardstyle2';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/RootStackParamList';
import AsyncStorage from '@react-native-async-storage/async-storage';

type MyorderScreenProps = StackScreenProps<RootStackParamList, 'Myorder'>;

const Myorder = ({ navigation }: MyorderScreenProps) => {
    const theme = useTheme();
    const { colors } = theme;

    const scrollRef = useRef<ScrollView>(null);
    const scrollX = useRef(new Animated.Value(0)).current;
    const [currentIndex, setCurrentIndex] = useState(0);

    const [myOrderData, setMyOrderData] = useState([]);
    const [completedData, setCompletedData] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchOngoingData();
            fetchCompletedData();
            const onBackPress = () => {
                navigation.navigate('Home'); // Replace 'Home' with your actual home screen name
                return true; // Prevent default behavior
            };

            BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => {
                BackHandler.removeEventListener('hardwareBackPress', onBackPress);
            };
        }, [])
    );

    const fetchOngoingData = async () => {
        try {
            setLoading(true);
            const userId = await AsyncStorage.getItem('userId');
            const response = await fetch(`https://egadgetworld.in/api/v1/myorder?userid=${userId}&status=pending`);
            const json = await response.json();
            setMyOrderData(json);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCompletedData = async () => {
        try {
            setLoading(true);
            const userId = await AsyncStorage.getItem('userId');
            const response = await fetch(`https://egadgetworld.in/api/v1/myorder?userid=${userId}&status=completed`);
            const json = await response.json();
            setCompletedData(json);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        Promise.all([fetchOngoingData(), fetchCompletedData()]).then(() => setRefreshing(false));
    }, []);

    const onPressTouch = (val: number) => {
        setCurrentIndex(val);
        scrollRef.current?.scrollTo({
            x: SIZES.width * val,
            animated: true,
        });
    };

    return (
        <View style={{ backgroundColor: colors.card, flex: 1 }}>
            <Header title="My Order" leftIcon="back" titleRight />
            <View style={GlobalStyleSheet.container}>
                <View style={{ flexDirection: 'row', gap: 10, marginRight: 10 }}>
                    <TouchableOpacity
                        onPress={() => onPressTouch(0)}
                        style={[
                            GlobalStyleSheet.TouchableOpacity2,
                            {
                                backgroundColor: currentIndex === 0 ? colors.title : colors.card,
                                borderColor: currentIndex === 0 ? colors.title : colors.title,
                            },
                        ]}
                    >
                        <Text
                            style={{
                                ...FONTS.fontRegular,
                                fontSize: 19,
                                color: currentIndex === 0 ? (theme.dark ? COLORS.title : colors.card) : colors.title,
                            }}
                        >
                            Ongoing
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => onPressTouch(1)}
                        style={[
                            GlobalStyleSheet.TouchableOpacity2,
                            {
                                backgroundColor: currentIndex === 1 ? colors.title : colors.card,
                                borderColor: currentIndex === 1 ? colors.title : colors.title,
                            },
                        ]}
                    >
                        <Text
                            style={{
                                ...FONTS.fontRegular,
                                fontSize: 19,
                                color: currentIndex === 1 ? (theme.dark ? COLORS.title : colors.card) : colors.title,
                            }}
                        >
                            Completed
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                ref={scrollRef}
            >
                <View style={{ width: SIZES.width }}>
                    <View style={[GlobalStyleSheet.container, { paddingTop: 0 }]}>
                        <View style={{ marginHorizontal: -15 }}>
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                            >
                                {myOrderData.length > 0 ? (
                                    myOrderData.map((data: any, index) => (
                                        <Cardstyle2
                                            key={index}
                                            title={data.name + ' | ' + data.skuno + ' | ' + data.modelno}
                                            price={data.amount}
                                            delevery={data.delivery}
                                            image={data.image}
                                            offer={data.status}
                                            removelikebtn
                                            btntitle={data.btntitle}
                                            onPress={() => navigation.navigate('Trackorder', { data })}
                                        />
                                    ))
                                ) : (
                                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                        <Text>No orders found</Text>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </View>
                <View style={{ width: SIZES.width }}>
                    <View style={[GlobalStyleSheet.container, { paddingTop: 0 }]}>
                        <View style={{ marginHorizontal: -15 }}>
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                            >
                                {completedData.length > 0 ? (
                                    completedData.map((data: any, index) => (
                                        <Cardstyle2
                                            key={index}
                                            title={data.name + ' | ' + data.skuno + ' | ' + data.modelno}
                                            price={data.amount}
                                            delevery={data.delivery}
                                            image={data.image}
                                            offer={data.status}
                                            removelikebtn
                                            btntitle={data.btntitle}
                                            onPress={() => navigation.navigate('Writereview', { data })}
                                        />
                                    ))
                                ) : (
                                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                        <Text>No orders found</Text>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

export default Myorder;
