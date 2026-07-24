import { useState } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { ActionButton, ProductHeader, SearchContent } from "@/shared/components";

const HomeScreen = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const handleCancelSearch = () => {
    setIsSearching(false);
    setSearchValue("");
  };

  return (
    <View style={s.container}>
      <ProductHeader
        isSearching={isSearching}
        onSearchFocus={() => setIsSearching(true)}
        onSearchCancel={handleCancelSearch}
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
      >
        <ActionButton
          actions={[
            { icon: "bell", onPress: () => {} },
            { icon: "cart", onPress: () => {} },
          ]}
          iconOnly
        />
      </ProductHeader>

      {isSearching ? (
        <SearchContent keyword={searchValue} />
      ) : (
        <View style={s.content} />
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
});

export default HomeScreen;
