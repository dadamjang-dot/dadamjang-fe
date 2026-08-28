import * as Crypto from "expo-crypto";
import { useMemo, useRef, useState } from "react";
import { Image } from "expo-image";
import { Modal, ScrollView, Text, TextInput, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

import { useCreateStylePost, usePurchasedStyleProducts } from "../hooks";
import { uploadStylePostImage } from "../api";
import {
  getStyleMentionQuery,
  insertStyleBrandMention,
  normalizeStyleHashtag,
  validateStylePostDraft,
} from "../rules";
import type { PurchasedStyleProduct, StylePostCategory, StylePostImageAsset } from "../types";
import { loadStyleImagePicker } from "./style-image-picker";
import { Button, TitleHeader } from "@/shared/components";

type StyleComposerProps = { onClose: () => void };

const categories: { key: StylePostCategory; label: string }[] = [
  { key: "SNEAKERS", label: "스니커즈" },
  { key: "CLOTHING", label: "의류" },
  { key: "ACCESSORIES", label: "잡화" },
];

const StyleComposer = ({ onClose }: StyleComposerProps) => {
  const purchasedProducts = usePurchasedStyleProducts();
  const createMutation = useCreateStylePost();
  const [category, setCategory] = useState<StylePostCategory>("CLOTHING");
  const [selectedProducts, setSelectedProducts] = useState<PurchasedStyleProduct[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<StylePostImageAsset[]>([]);
  const [brandTagIds, setBrandTagIds] = useState<string[]>([]);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string>();
  const [idempotencyKey] = useState(() => Crypto.randomUUID());
  const submitLock = useRef(false);

  const mentionProducts = useMemo(() => {
    const query = getStyleMentionQuery(body);
    if (query === null) return [];
    return selectedProducts.filter((product) => product.brandName?.toLowerCase().includes(query));
  }, [body, selectedProducts]);

  const addHashtag = () => {
    const tag = normalizeStyleHashtag(tagDraft);
    if (!tag) return;
    if (!/^[가-힣A-Za-z0-9_]{1,20}$/.test(tag)) {
      setMessage("해시태그에는 한글, 영문, 숫자, 밑줄(_)만 쓸 수 있어요.");
      return;
    }
    if (hashtags.includes(tag)) {
      setTagDraft("");
      return;
    }
    if (hashtags.length >= 10) {
      setMessage("해시태그는 최대 10개까지 추가할 수 있어요.");
      return;
    }
    setHashtags((current) => [...current, tag]);
    setTagDraft("");
    setMessage(undefined);
  };

  const toggleProduct = (product: PurchasedStyleProduct) => {
    const isSelected = selectedProducts.some((selected) => selected.productId === product.productId);
    const next = isSelected
      ? selectedProducts.filter((selected) => selected.productId !== product.productId)
      : selectedProducts.length < 5
        ? [...selectedProducts, product]
        : selectedProducts;
    setSelectedProducts(next);
    setBrandTagIds((current) => current.filter((brandId) => next.some((selected) => selected.brandId === brandId)));
  };

  const insertBrandMention = (product: PurchasedStyleProduct) => {
    if (!product.brandName) return;
    setBody(insertStyleBrandMention(body, product.brandName));
    if (product.brandId) setBrandTagIds((current) => current.includes(product.brandId!) ? current : [...current, product.brandId!]);
  };

  const pickImages = async () => {
    if (images.length >= 5) return;
    try {
      const ImagePicker = await loadStyleImagePicker();
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setMessage("사진을 추가하려면 사진 보관함 접근을 허용해 주세요.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: ["images"],
        selectionLimit: 5 - images.length,
        quality: 0.85,
      });
      if (!result.canceled) {
        setImages((current) => [...current, ...result.assets.map((asset) => ({
          uri: asset.uri,
          fileName: asset.fileName,
          fileSize: asset.fileSize,
          mimeType: asset.mimeType,
        }))].slice(0, 5));
        setMessage(undefined);
      }
    } catch (error) {
      setMessage(error instanceof Error && error.message.includes("ExponentImagePicker") ? "사진을 선택하려면 앱을 다시 설치해 주세요." : "사진을 불러오지 못했어요.");
    }
  };

  const handleSubmit = async () => {
    if (submitLock.current) return;
    submitLock.current = true;
    const content = body.trim();
    const validationMessage = validateStylePostDraft({
      content,
      productCount: selectedProducts.length,
      imageCount: images.length,
    });
    if (validationMessage) {
      submitLock.current = false;
      setMessage(validationMessage);
      return;
    }

    setMessage(undefined);
    setIsSubmitting(true);
    try {
      const imageKeys: string[] = [];
      for (const [index, image] of images.entries())
        imageKeys.push(await uploadStylePostImage(image, index));
      await createMutation.mutateAsync({
        category,
        productIds: selectedProducts.map((product) => product.productId),
        imageKeys,
        content,
        hashtags,
        brandTagIds,
        idempotencyKey,
      });
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "스타일을 등록하지 못했어요. 입력한 내용을 확인해 주세요.");
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <View style={s.container}>
      <TitleHeader title="스타일 올리기">
        <Button label="닫기" onPress={onClose} style={s.closeButton} variant="bare" />
      </TitleHeader>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={s.sectionTitle}>카테고리</Text>
        <View style={s.chipRow}>
          {categories.map(({ key, label }) => (
            <Button key={key} label={label} onPress={() => setCategory(key)} style={[s.chip, category === key && s.selectedChip]} variant="secondary" />
          ))}
        </View>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>구매한 상품 {selectedProducts.length}/5</Text>
          <Button label="상품 고르기" onPress={() => setIsProductPickerOpen(true)} style={s.textButton} variant="bare" />
        </View>
        {selectedProducts.length ? (
          <View style={s.selectedProductList}>
            {selectedProducts.map((product) => <Text key={product.productId} style={s.selectedProduct}>• {product.brandName ? `${product.brandName} · ` : ""}{product.title}</Text>)}
          </View>
        ) : <Text style={s.helper}>구매 내역에서 함께 올릴 상품을 골라주세요.</Text>}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>이미지 {images.length}/5</Text>
          <Button label="사진 추가" disabled={images.length >= 5} onPress={pickImages} style={s.textButton} variant="bare" />
        </View>
        <View style={s.imageRow}>
          {images.map((image, index) => (
            <View key={`${image.uri}-${index}`} style={s.imageItem}>
              <Image contentFit="cover" source={image.uri} style={s.preview} />
              <Button accessibilityLabel="사진 삭제" onPress={() => setImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} style={s.removeImage} variant="bare">
                <Text style={s.removeImageLabel}>×</Text>
              </Button>
            </View>
          ))}
        </View>
        <Text style={s.sectionTitle}>스타일 소개</Text>
        <TextInput
          accessibilityLabel="스타일 소개"
          multiline
          onChangeText={setBody}
          placeholder="어떤 스타일인지 알려주세요. @를 입력하면 구매한 상품의 브랜드를 태그할 수 있어요."
          style={s.bodyInput}
          textAlignVertical="top"
          value={body}
        />
        {mentionProducts.length ? (
          <View style={s.mentionBox}>
            {mentionProducts.map((product) => <Button key={product.productId} label={`@${product.brandName}`} onPress={() => insertBrandMention(product)} style={s.mentionButton} variant="bare" />)}
          </View>
        ) : null}
        {brandTagIds.length ? <Text style={s.helper}>브랜드 태그: {brandTagIds.map((brandId) => selectedProducts.find((product) => product.brandId === brandId)?.brandName).filter(Boolean).map((name) => `@${name}`).join(" ")}</Text> : null}
        <Text style={s.sectionTitle}>해시태그</Text>
        <View style={s.tagInputRow}>
          <TextInput
            autoCapitalize="none"
            onChangeText={setTagDraft}
            onSubmitEditing={addHashtag}
            placeholder="#태그 입력"
            style={s.tagInput}
            value={tagDraft}
          />
          <Button label="추가" onPress={addHashtag} style={s.addTagButton} variant="secondary" />
        </View>
        <View style={s.chipRow}>
          {hashtags.map((tag) => <Button key={tag} label={`#${tag}  ×`} onPress={() => setHashtags((current) => current.filter((item) => item !== tag))} style={s.tagChip} variant="secondary" />)}
        </View>
        {message ? <Text style={s.error}>{message}</Text> : null}
        <Button disabled={isSubmitting || createMutation.isPending} label={isSubmitting ? "등록 중" : "스타일 올리기"} onPress={handleSubmit} style={s.submitButton} />
      </ScrollView>
      <Modal animationType="slide" onRequestClose={() => setIsProductPickerOpen(false)} presentationStyle="formSheet" visible={isProductPickerOpen}>
        <View style={s.modalContainer}>
          <TitleHeader title="구매한 상품 고르기">
            <Button label="완료" onPress={() => setIsProductPickerOpen(false)} style={s.closeButton} variant="bare" />
          </TitleHeader>
          {purchasedProducts.isLoading ? <Text style={s.helper}>구매 내역을 불러오는 중이에요.</Text> : null}
          {purchasedProducts.isError ? <Text style={s.error}>구매 내역을 불러오지 못했어요.</Text> : null}
          <ScrollView contentContainerStyle={s.modalList} showsVerticalScrollIndicator={false}>
            {purchasedProducts.data?.map((product) => {
              const selected = selectedProducts.some((item) => item.productId === product.productId);
              return (
                <Button key={product.productId} accessibilityState={{ selected }} onPress={() => toggleProduct(product)} style={s.productPickerRow} variant="bare">
                  {product.imageUrls[0] ? <Image contentFit="cover" source={product.imageUrls[0]} style={s.pickerImage} /> : <View style={s.pickerPlaceholder} />}
                  <View style={s.productCopy}>
                    <Text numberOfLines={1} style={s.productTitle}>{product.title}</Text>
                    {product.brandName ? <Text style={s.helper}>{product.brandName}</Text> : null}
                  </View>
                  <Image source={selected ? "sf:checkmark.circle.fill" : "sf:circle"} style={s.checkIcon} />
                </Button>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { gap: spacing.md, padding: 16, paddingBottom: 32 },
  closeButton: { paddingHorizontal: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18 },
  selectedChip: { borderColor: colors.ink, backgroundColor: colors.primarySoft },
  textButton: { minHeight: 36, paddingHorizontal: 4 },
  helper: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  selectedProductList: { gap: 4 },
  selectedProduct: { color: colors.ink, fontSize: 14 },
  imageRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  imageItem: { position: "relative", width: 88, height: 112, borderRadius: 8, overflow: "hidden", backgroundColor: colors.primarySoft },
  preview: { width: "100%", height: "100%" },
  removeImage: { position: "absolute", top: 4, right: 4, width: 24, height: 24, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.surface },
  removeImageLabel: { color: colors.ink, fontSize: 18, lineHeight: 20 },
  bodyInput: { minHeight: 140, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 8, color: colors.ink, fontSize: 15, lineHeight: 22 },
  mentionBox: { gap: 4, padding: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 8 },
  mentionButton: { alignItems: "flex-start", minHeight: 36, paddingHorizontal: 8 },
  tagInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tagInput: { flex: 1, minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 8, color: colors.ink },
  addTagButton: { minHeight: 44, paddingHorizontal: 16 },
  tagChip: { minHeight: 32, paddingHorizontal: 12, borderRadius: 16 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
  submitButton: { minHeight: 52, marginTop: spacing.sm },
  modalContainer: { flex: 1, backgroundColor: colors.surface },
  modalList: { gap: 8, padding: 16, paddingBottom: 32 },
  productPickerRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 72, padding: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 8 },
  pickerImage: { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.primarySoft },
  pickerPlaceholder: { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.primarySoft },
  productCopy: { flex: 1, gap: 4 },
  productTitle: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  checkIcon: { width: 20, height: 20, tintColor: colors.ink },
});

export default StyleComposer;
