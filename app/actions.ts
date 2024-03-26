'use server'

import { sql } from '@vercel/postgres'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const FormSchema = z.object({
  id : z.string(),
  customerID : z.string({invalid_type_error: "Please select a customer"}),
  amount : z.coerce.number().gt(0,{message: "You need to insert a value greater than 0"}),
  status : z.enum(['pending', 'paid'], {
    invalid_type_error: "Please select an invoice status"
  }),
  date: z.string()
})

export type State = {
  errors?: {
    customerID?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string;
}

const CreateInvoiceFormSchema = FormSchema.omit({id:true, date:true})

export async function createInvoice(prev_state:State, formData: FormData) {
  const validateFields = CreateInvoiceFormSchema.safeParse({
    customerID : formData.get("customerId"),
    amount : formData.get("amount"),
    status : formData.get("status"),
  })
  if (!validateFields.success){
    return {
      errors: validateFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to perform operation"
    }
  }

  const {customerID,  amount, status }  = validateFields.data

  const amountInCents = amount*100;
  const date = new Date().toISOString().split("T")[0]

  try {
    await sql`
      INSERT INTO invoices (customerId, amount, status, date)
      VALUES (${customerID}, ${amountInCents}, ${status}, ${date})
    `
  }
  catch (error){
    return {message:"DB ERROR: Unable to create invoice"}
  }
  revalidatePath("/dashboard/invoices")
  redirect("/dashboard/invoices")
}


const UpdateInvoiceFormSchema = FormSchema.omit({id:true, date:true})
export async function updateInvoice(id:string, prev_state:State, formData: FormData) {
  const validateFields = UpdateInvoiceFormSchema.safeParse({
    customerID : formData.get("customerId"),
    amount : formData.get("amount"),
    status : formData.get("status"),
  })

  if (!validateFields.success){
    return {
      errors : validateFields.error.flatten().fieldErrors,
      message: "Missing Fields. Unable to perform operation"
    }
  }

  const {customerID, amount, status } = validateFields.data
  const amountInCents = amount*100;

  try {
    await sql`
      UPDATE invoices 
      set customerId = ${customerID}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `
  }
  catch (error){
    return {message:"DB ERROR: Unable to edit invoice"}
  }
  revalidatePath("/dashboard/invoices")
  redirect("/dashboard/invoices")
}

export async function deleteInvoice(id:string) {
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`
    revalidatePath("/dashboard/invoices")
    return {message:"Delete Invoice"}
  }
  catch (error) {
    return {message: "DB ERROR: Unable to delete Invoice"}
  }
}
