import type { ICategory } from "@/interfaces/categories/ICategory"

type ProductCategoryReference = {
    categoryID?: string | null
    category?: ICategory | null
}

const getCategoryChildren = (category: ICategory): ICategory[] => {
    const categoryWithChildren = category as ICategory & { children?: ICategory[] }
    return category.subcategories ?? categoryWithChildren.children ?? []
}

const findCategoryById = (
    categories: ICategory[],
    categoryID: string,
    parent: ICategory | null = null,
): { category: ICategory; parent: ICategory | null } | null => {
    for (const category of categories) {
        if (category.categoryID === categoryID) return { category, parent }

        const childMatch = findCategoryById(getCategoryChildren(category), categoryID, category)
        if (childMatch) return childMatch
    }

    return null
}

export function getProductCategoryName(
    product: ProductCategoryReference,
    categories: ICategory[],
    fallback = "",
): string {
    const categoryID = product.category?.categoryID || product.categoryID
    if (!categoryID) return fallback

    const match = findCategoryById(categories, categoryID)
    const category = match?.category ?? product.category
    if (!category?.name) return fallback

    const parent = match?.parent ?? categories.find((item) => item.categoryID === category.parentID)
    return parent?.name ? `${parent.name} / ${category.name}` : category.name
}
